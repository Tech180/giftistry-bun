import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { app } from '../src/index';
import { sql } from '../src/common/database/connection';

describe('Server ownership transfer', () => {
  const timestamp = Date.now();
  const ownerEmail = `owner_${timestamp}@example.com`;
  const ownerUsername = `owner_${timestamp}`;
  const targetEmail = `target_${timestamp}@example.com`;
  const targetUsername = `target_${timestamp}`;
  let ownerUserId: string;
  let targetUserId: string;
  let ownerToken: string;
  let targetToken: string;

  async function cleanUpUser(userId: string) {
    if (!userId) return;
    try {
      await sql`DELETE FROM users WHERE id = ${userId}`;
    } catch {
      // ignore
    }
  }

  beforeAll(async () => {
    const ownerRes = await app.handle(
      new Request('http://localhost/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Giftistry: {
            Auth: {
              username: ownerUsername,
              email: ownerEmail,
              password: 'password123',
              firstName: 'Owner',
              lastName: 'User',
            },
          },
        }),
      })
    );
    const ownerBody = await ownerRes.json();
    ownerUserId = ownerBody.Result.User.Id;
    ownerToken = ownerBody.Result.Token;

    await sql`UPDATE users SET is_admin = true, is_owner = true WHERE id = ${ownerUserId}`;

    const targetRes = await app.handle(
      new Request('http://localhost/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Giftistry: {
            Auth: {
              username: targetUsername,
              email: targetEmail,
              password: 'password123',
              firstName: 'Target',
              lastName: 'User',
            },
          },
        }),
      })
    );
    const targetBody = await targetRes.json();
    targetUserId = targetBody.Result.User.Id;
    targetToken = targetBody.Result.Token;
  });

  afterAll(async () => {
    await cleanUpUser(ownerUserId);
    await cleanUpUser(targetUserId);
  });

  test('non-owner cannot transfer ownership', async () => {
    const res = await app.handle(
      new Request('http://localhost/api/system/transfer-ownership', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${targetToken}`,
        },
        body: JSON.stringify({
          Giftistry: {
            Ownership: {
              userId: ownerUserId,
            },
          },
        }),
      })
    );
    expect(res.status).toBe(403);
  });

  test('owner can transfer ownership to another user', async () => {
    const res = await app.handle(
      new Request('http://localhost/api/system/transfer-ownership', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({
          Giftistry: {
            Ownership: {
              userId: targetUserId,
            },
          },
        }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.Result.NewOwnerId).toBe(targetUserId);

    const [ownerRow] = await sql<any[]>`
      SELECT is_owner as "IsOwner", is_admin as "IsAdmin" FROM users WHERE id = ${ownerUserId}
    `;
    const [targetRow] = await sql<any[]>`
      SELECT is_owner as "IsOwner", is_admin as "IsAdmin" FROM users WHERE id = ${targetUserId}
    `;

    expect(ownerRow.IsOwner).toBe(false);
    expect(targetRow.IsOwner).toBe(true);
    expect(targetRow.IsAdmin).toBe(true);
  });
});
