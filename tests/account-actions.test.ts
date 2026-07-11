import { expect, test, describe, beforeAll, afterAll } from 'bun:test';
import { app } from '../src/index';
import { sql } from '../src/common/database/connection';
import {
  createTestUser,
  createTestWishlist,
  shareTestWishlist,
  cleanUpUser,
  cleanUpWishlist,
  testPassword,
} from './helper';

describe('Account actions and disabled-user enforcement', () => {
  let disableUser: Awaited<ReturnType<typeof createTestUser>>;
  let deleteUser: Awaited<ReturnType<typeof createTestUser>>;
  let listOwner: Awaited<ReturnType<typeof createTestUser>>;
  let collaborator: Awaited<ReturnType<typeof createTestUser>>;
  let disabledTarget: Awaited<ReturnType<typeof createTestUser>>;
  let friendSender: Awaited<ReturnType<typeof createTestUser>>;
  let sharedListId: string;

  beforeAll(async () => {
    const ts = Date.now();
    disableUser = await createTestUser(`disable_${ts}`, `disable_${ts}@example.com`);
    deleteUser = await createTestUser(`delete_${ts}`, `delete_${ts}@example.com`);
    listOwner = await createTestUser(`listowner_${ts}`, `listowner_${ts}@example.com`);
    collaborator = await createTestUser(`collab_${ts}`, `collab_${ts}@example.com`);
    disabledTarget = await createTestUser(`disabled_${ts}`, `disabled_${ts}@example.com`);
    friendSender = await createTestUser(`sender_${ts}`, `sender_${ts}@example.com`);

    await sql`UPDATE users SET is_owner = false, is_admin = false WHERE id = ${disableUser.userId}`;
    await sql`UPDATE users SET is_owner = false, is_admin = false WHERE id = ${deleteUser.userId}`;
    await sql`UPDATE users SET is_owner = false, is_admin = false WHERE id = ${listOwner.userId}`;
    await sql`UPDATE users SET is_owner = false, is_admin = false WHERE id = ${collaborator.userId}`;
    await sql`UPDATE users SET is_owner = false, is_admin = false WHERE id = ${disabledTarget.userId}`;
    await sql`UPDATE users SET is_owner = false, is_admin = false WHERE id = ${friendSender.userId}`;

    sharedListId = await createTestWishlist(listOwner.token, 'Shared before disable');
    await shareTestWishlist(listOwner.token, sharedListId, collaborator.email, 'viewer');
  });

  afterAll(async () => {
    if (sharedListId) await cleanUpWishlist(sharedListId);
    if (disableUser.userId) await cleanUpUser(disableUser.userId);
    if (deleteUser.userId) await cleanUpUser(deleteUser.userId);
    await cleanUpUser(listOwner.userId);
    await cleanUpUser(collaborator.userId);
    await cleanUpUser(disabledTarget.userId);
    await cleanUpUser(friendSender.userId);
  });

  test('SSO routes return 404 after removal', async () => {
    const routes = [
      'http://localhost/api/auth/sso/github',
      'http://localhost/api/auth/sso/github/callback',
      'http://localhost/api/auth/sso/email-otp',
      'http://localhost/api/auth/sso/email-verify',
    ];

    for (const url of routes) {
      const res = await app.handle(new Request(url, { method: url.includes('email-otp') || url.includes('email-verify') ? 'POST' : 'GET' }));
      expect(res.status).toBe(404);
    }
  });

  test('Self-disable succeeds without password', async () => {
    await sql`
      UPDATE users SET is_owner = false, is_disabled = false, is_admin = false
      WHERE id = ${disableUser.userId}
    `;

    const res = await app.handle(
      new Request('http://localhost/api/auth/account/disable', {
        method: 'POST',
        headers: { Authorization: `Bearer ${disableUser.token}` },
      })
    );
    expect(res.status).toBe(200);

    const loginRes = await app.handle(
      new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Giftistry: { Auth: { Email: disableUser.email, Password: testPassword } },
        }),
      })
    );
    expect(loginRes.status).toBe(403);
  });

  test('Self-delete requires password and succeeds with correct password', async () => {
    const badRes = await app.handle(
      new Request('http://localhost/api/auth/account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${deleteUser.token}`,
        },
        body: JSON.stringify({
          Giftistry: { Auth: { Password: 'wrong-password' } },
        }),
      })
    );
    expect(badRes.status).toBe(401);

    const goodRes = await app.handle(
      new Request('http://localhost/api/auth/account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${deleteUser.token}`,
        },
        body: JSON.stringify({
          Giftistry: { Auth: { Password: testPassword } },
        }),
      })
    );
    expect(goodRes.status).toBe(200);

    const [row] = await sql`SELECT id FROM users WHERE id = ${deleteUser.userId}`;
    expect(row).toBeUndefined();
    deleteUser.userId = '';
  });

  test('Server owner cannot disable or delete own account', async () => {
    const ts = Date.now();
    const ownerUser = await createTestUser(`soleowner_${ts}`, `soleowner_${ts}@example.com`);
    await sql`UPDATE users SET is_owner = true WHERE id = ${ownerUser.userId}`;

    const disableRes = await app.handle(
      new Request('http://localhost/api/auth/account/disable', {
        method: 'POST',
        headers: { Authorization: `Bearer ${ownerUser.token}` },
      })
    );
    expect(disableRes.status).toBe(400);

    const deleteRes = await app.handle(
      new Request('http://localhost/api/auth/account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerUser.token}`,
        },
        body: JSON.stringify({
          Giftistry: { Auth: { Password: testPassword } },
        }),
      })
    );
    expect(deleteRes.status).toBe(400);

    await sql`UPDATE users SET is_owner = false WHERE id = ${ownerUser.userId}`;
    await cleanUpUser(ownerUser.userId);
  });

  test('Disabled owner wishlist returns 403 for collaborator', async () => {
    await sql`UPDATE users SET is_disabled = true, session_version = session_version + 1 WHERE id = ${listOwner.userId}`;

    const res = await app.handle(
      new Request(`http://localhost/api/wishlists/${sharedListId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${collaborator.token}` },
      })
    );
    expect(res.status).toBe(403);

    await sql`UPDATE users SET is_disabled = false WHERE id = ${listOwner.userId}`;
  });

  test('Friend request to disabled user is rejected', async () => {
    await sql`UPDATE users SET is_disabled = true WHERE id = ${disabledTarget.userId}`;

    const res = await app.handle(
      new Request('http://localhost/api/friends/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${friendSender.token}`,
        },
        body: JSON.stringify({
          Giftistry: {
            Friends: {
              ReceiverId: disabledTarget.userId
            }
          }
        }),
      })
    );
    expect(res.status).toBe(400);

    await sql`UPDATE users SET is_disabled = false WHERE id = ${disabledTarget.userId}`;
  });

  test('Existing friendship persists when user is disabled', async () => {
    const ts = Date.now();
    const userX = await createTestUser(`fx_${ts}`, `fx_${ts}@example.com`);
    const userY = await createTestUser(`fy_${ts}`, `fy_${ts}@example.com`);

    const reqRes = await app.handle(
      new Request('http://localhost/api/friends/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userX.token}`,
        },
        body: JSON.stringify({
          Giftistry: {
            Friends: {
              ReceiverId: userY.userId
            }
          }
        }),
      })
    );
    const reqBody = await reqRes.json() as any;
    const requestId = reqBody.Result.Id;

    await app.handle(
      new Request(`http://localhost/api/friends/requests/${requestId}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${userY.token}` },
      })
    );

    const [before] = await sql`
      SELECT COUNT(*)::integer as count FROM friends
      WHERE (user_a_id = ${userX.userId} AND user_b_id = ${userY.userId})
         OR (user_a_id = ${userY.userId} AND user_b_id = ${userX.userId})
    `;
    expect(before.count).toBe(1);

    await sql`UPDATE users SET is_disabled = true WHERE id = ${userY.userId}`;

    const [after] = await sql`
      SELECT COUNT(*)::integer as count FROM friends
      WHERE (user_a_id = ${userX.userId} AND user_b_id = ${userY.userId})
         OR (user_a_id = ${userY.userId} AND user_b_id = ${userX.userId})
    `;
    expect(after.count).toBe(1);

    await cleanUpUser(userX.userId);
    await cleanUpUser(userY.userId);
  });

  test('User preview returns IsDisabled for disabled user', async () => {
    await sql`UPDATE users SET is_disabled = true WHERE id = ${disabledTarget.userId}`;

    const res = await app.handle(
      new Request(`http://localhost/api/users/${disabledTarget.userId}/preview`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${friendSender.token}` },
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.Result.User.IsDisabled).toBe(true);
    expect(body.Result.User.Username).toBe(disabledTarget.username);

    await sql`UPDATE users SET is_disabled = false WHERE id = ${disabledTarget.userId}`;
  });
});
