import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { app } from '../src/index';
import { sql } from '../src/common/database';
import { ensureOpenRegistration } from './helper';

describe('Registration invite links', () => {
  const timestamp = Date.now();
  const adminUsername = `reg_inv_admin_${timestamp}`;
  const adminEmail = `reg_inv_admin_${timestamp}@example.com`;
  let adminUserId = '';
  let adminToken = '';
  let previousPolicy: Record<string, unknown> | null = null;

  async function cleanUpUser(userId: string) {
    if (!userId) return;
    try {
      await sql`DELETE FROM users WHERE id = ${userId}`;
    } catch {
      // ignore
    }
  }

  async function setRegistrationMode(mode: 'open' | 'invite_only' | 'disabled') {
    const policyGet = await app.handle(
      new Request('http://localhost/api/admin/site-policy', {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
    );
    const current = await policyGet.json();
    const policy = current.Result.Policy;
    previousPolicy = policy;

    await app.handle(
      new Request('http://localhost/api/admin/site-policy', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          Giftistry: {
            SitePolicy: {
              ...policy,
              RegistrationMode: mode,
              RegistrationInviteTtlHours: 24,
              RegistrationInviteMaxUses: 1,
            },
          },
        }),
      })
    );
  }

  beforeAll(async () => {
    await ensureOpenRegistration();

    const signupRes = await app.handle(
      new Request('http://localhost/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Giftistry: {
            Auth: {
              Username: adminUsername,
              Email: adminEmail,
              Password: 'password123',
              FirstName: 'Admin',
              LastName: 'Invite',
            },
          },
        }),
      })
    );
    const signupBody = await signupRes.json();
    expect(signupRes.status).toBe(200);
    adminUserId = signupBody.Result.User.Id;
    adminToken = signupBody.Result.Token;
    await sql`UPDATE users SET is_admin = true WHERE id = ${adminUserId}`;
  });

  afterAll(async () => {
    if (previousPolicy && adminToken) {
      await app.handle(
        new Request('http://localhost/api/admin/site-policy', {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            Giftistry: {
              SitePolicy: previousPolicy,
            },
          }),
        })
      );
    }
    await sql`DELETE FROM registration_invites WHERE created_by = ${adminUserId}`.catch(() => undefined);
    await cleanUpUser(adminUserId);
  });

  test('invite_only blocks signup without token and allows with valid invite', async () => {
    await setRegistrationMode('invite_only');

    const blocked = await app.handle(
      new Request('http://localhost/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Giftistry: {
            Auth: {
              Username: `blocked_${timestamp}`,
              Email: `blocked_${timestamp}@example.com`,
              Password: 'password123',
              FirstName: 'Blocked',
              LastName: 'User',
            },
          },
        }),
      })
    );
    expect(blocked.status).toBe(403);

    const regen = await app.handle(
      new Request('http://localhost/api/admin/registration-invite/regenerate', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })
    );
    const regenBody = await regen.json();
    expect(regen.status).toBe(200);
    const token = regenBody.Result.Token as string;
    expect(token).toBeTruthy();
    expect(regenBody.Result.Url).toContain(`/register?invite=${token}`);

    const validate = await app.handle(
      new Request(`http://localhost/api/auth/registration-invite/${token}`)
    );
    const validateBody = await validate.json();
    expect(validate.status).toBe(200);
    expect(validateBody.Result.Valid).toBe(true);

    const allowedUsername = `allowed_${timestamp}`;
    const allowed = await app.handle(
      new Request('http://localhost/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Giftistry: {
            Auth: {
              Username: allowedUsername,
              Email: `allowed_${timestamp}@example.com`,
              Password: 'password123',
              FirstName: 'Allowed',
              LastName: 'User',
              InviteToken: token,
            },
          },
        }),
      })
    );
    const allowedBody = await allowed.json();
    expect(allowed.status).toBe(200);
    expect(allowedBody.Result.User.Username).toBe(allowedUsername);

    const statusRes = await app.handle(
      new Request('http://localhost/api/admin/registration-invite', {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
    );
    const statusBody = await statusRes.json();
    const usedInvite = statusBody.Result.Invites.find(
      (i: { Id: string }) => i.Id === regenBody.Result.Id
    );
    expect(usedInvite?.Status).toBe('completed');

    const reused = await app.handle(
      new Request(`http://localhost/api/auth/registration-invite/${token}`)
    );
    expect((await reused.json()).Result.Valid).toBe(false);

    await cleanUpUser(allowedBody.Result.User.Id);
  });

  test('generate keeps previous invite tokens active and lists them', async () => {
    await setRegistrationMode('invite_only');

    const first = await app.handle(
      new Request('http://localhost/api/admin/registration-invite/regenerate', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })
    );
    const firstBody = await first.json();
    const oldToken = firstBody.Result.Token as string;
    const firstId = firstBody.Result.Id as string;

    const second = await app.handle(
      new Request('http://localhost/api/admin/registration-invite/regenerate', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })
    );
    const secondBody = await second.json();
    const newToken = secondBody.Result.Token as string;
    expect(newToken).not.toBe(oldToken);

    const oldValidate = await app.handle(
      new Request(`http://localhost/api/auth/registration-invite/${oldToken}`)
    );
    const oldValidateBody = await oldValidate.json();
    expect(oldValidateBody.Result.Valid).toBe(true);

    const newValidate = await app.handle(
      new Request(`http://localhost/api/auth/registration-invite/${newToken}`)
    );
    const newValidateBody = await newValidate.json();
    expect(newValidateBody.Result.Valid).toBe(true);

    const statusRes = await app.handle(
      new Request('http://localhost/api/admin/registration-invite', {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
    );
    const statusBody = await statusRes.json();
    expect(statusRes.status).toBe(200);
    expect(statusBody.Result.HasActiveInvite).toBe(true);
    expect(Array.isArray(statusBody.Result.Invites)).toBe(true);
    expect(statusBody.Result.Invites.length).toBeGreaterThanOrEqual(2);
    expect(statusBody.Result.Invites.some((i: { Id: string }) => i.Id === firstId)).toBe(true);
    expect(
      statusBody.Result.Invites.every((i: { Status: string }) =>
        ['active', 'completed', 'expired'].includes(i.Status)
      )
    ).toBe(true);
  });

  test('delete removes an invite link', async () => {
    await setRegistrationMode('invite_only');

    const regen = await app.handle(
      new Request('http://localhost/api/admin/registration-invite/regenerate', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })
    );
    const regenBody = await regen.json();
    const inviteId = regenBody.Result.Id as string;
    const token = regenBody.Result.Token as string;

    const deleted = await app.handle(
      new Request(`http://localhost/api/admin/registration-invite/${inviteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      })
    );
    expect(deleted.status).toBe(200);

    const validate = await app.handle(
      new Request(`http://localhost/api/auth/registration-invite/${token}`)
    );
    const validateBody = await validate.json();
    expect(validateBody.Result.Valid).toBe(false);

    const statusRes = await app.handle(
      new Request('http://localhost/api/admin/registration-invite', {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
    );
    const statusBody = await statusRes.json();
    expect(statusBody.Result.Invites.every((i: { Id: string }) => i.Id !== inviteId)).toBe(true);
  });

  test('disabled mode rejects signup even with a valid invite', async () => {
    await setRegistrationMode('invite_only');
    const regen = await app.handle(
      new Request('http://localhost/api/admin/registration-invite/regenerate', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })
    );
    const token = (await regen.json()).Result.Token as string;

    await setRegistrationMode('disabled');
    const blocked = await app.handle(
      new Request('http://localhost/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Giftistry: {
            Auth: {
              Username: `disabled_${timestamp}`,
              Email: `disabled_${timestamp}@example.com`,
              Password: 'password123',
              FirstName: 'Disabled',
              LastName: 'User',
              InviteToken: token,
            },
          },
        }),
      })
    );
    expect(blocked.status).toBe(403);
  });
});
