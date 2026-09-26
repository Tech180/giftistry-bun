import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { app } from '../src/index';
import { sql } from '../src/common/database';
import { createTestUser, testPassword } from './helper';

describe('Change password', () => {
  const timestamp = Date.now();
  const username = `pw_change_${timestamp}`;
  const email = `${username}@example.com`;
  let userId = '';
  let token = '';
  let previousPolicy: Record<string, unknown> = {};

  beforeAll(async () => {
    const [row] = await sql<{ policy: Record<string, unknown> }[]>`
      SELECT policy FROM site_policy WHERE id = 1
    `;
    previousPolicy = (row?.policy as Record<string, unknown>) ?? {};
    const nextPolicy = {
      ...previousPolicy,
      RegistrationMode: 'open',
      RequireStrongPasswords: true,
    };
    await sql`
      INSERT INTO site_policy (id, policy, updated_at)
      VALUES (1, ${JSON.stringify(nextPolicy)}::jsonb, NOW())
      ON CONFLICT (id) DO UPDATE SET
        policy = ${JSON.stringify(nextPolicy)}::jsonb,
        updated_at = NOW()
    `;

    const created = await createTestUser(username, email);
    userId = created.userId;
    token = created.token;
    await sql`UPDATE users SET force_password_change = true WHERE id = ${userId}`;
  });

  afterAll(async () => {
    if (userId) {
      await sql`DELETE FROM users WHERE id = ${userId}`;
    }
    if (Object.keys(previousPolicy).length > 0) {
      await sql`
        UPDATE site_policy
        SET policy = ${JSON.stringify(previousPolicy)}::jsonb, updated_at = NOW()
        WHERE id = 1
      `;
    }
  });

  test('rejects incorrect current password', async () => {
    const res = await app.handle(
      new Request('http://localhost/api/auth/password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          Giftistry: {
            Auth: {
              CurrentPassword: 'wrong-password',
              NewPassword: 'newsecurepass1',
            },
          },
        }),
      })
    );
    expect(res.status).toBe(401);
  });

  test('rejects weak new password when strong policy is on', async () => {
    const res = await app.handle(
      new Request('http://localhost/api/auth/password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          Giftistry: {
            Auth: {
              CurrentPassword: testPassword,
              NewPassword: 'abcdef',
            },
          },
        }),
      })
    );
    expect(res.status).toBe(400);
  });

  test('changes password, clears force flag, and reissues token', async () => {
    const res = await app.handle(
      new Request('http://localhost/api/auth/password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          Giftistry: {
            Auth: {
              CurrentPassword: testPassword,
              NewPassword: 'brandnewpass99',
            },
          },
        }),
      })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.Result.User.ForcePasswordChange).toBe(false);
    expect(body.Result.Token).toBeTruthy();
    token = body.Result.Token;

    const [updated] = await sql<{ force_password_change: boolean }[]>`
      SELECT force_password_change FROM users WHERE id = ${userId}
    `;
    expect(updated?.force_password_change).toBe(false);

    const loginRes = await app.handle(
      new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Giftistry: {
            Auth: {
              Username: username,
              Password: 'brandnewpass99',
            },
          },
        }),
      })
    );
    expect(loginRes.status).toBe(200);
  });
});
