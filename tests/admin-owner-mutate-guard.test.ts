import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { app } from '../src/index';
import { sql } from '../src/common/database';
import { createTestUser, cleanUpUser } from './helper';

describe('Admin mutations against server owner', () => {
  const timestamp = Date.now();
  const ownerUsername = `owner_guard_${timestamp}`;
  const adminUsername = `admin_guard_${timestamp}`;
  let ownerUserId: string;
  let adminUserId: string;
  let ownerToken: string;
  let adminToken: string;
  let previousPolicy: Record<string, unknown> = {};

  beforeAll(async () => {
    const [row] = await sql<{ policy: Record<string, unknown> }[]>`
      SELECT policy FROM site_policy WHERE id = 1
    `;
    previousPolicy = (row?.policy as Record<string, unknown>) ?? {};
    const nextPolicy = {
      ...previousPolicy,
      RegistrationMode: 'open',
    };
    await sql`
      INSERT INTO site_policy (id, policy, updated_at)
      VALUES (1, ${JSON.stringify(nextPolicy)}::jsonb, NOW())
      ON CONFLICT (id) DO UPDATE SET
        policy = ${JSON.stringify(nextPolicy)}::jsonb,
        updated_at = NOW()
    `;
    const { PostgresSitePolicyRepository } = await import(
      '@/common/infrastructure/repositories/postgres-site-policy.repository'
    );
    new PostgresSitePolicyRepository().invalidateCache();

    const owner = await createTestUser(ownerUsername, `${ownerUsername}@example.com`);
    ownerUserId = owner.userId;
    ownerToken = owner.token;
    await sql`UPDATE users SET is_admin = true, is_owner = true WHERE id = ${ownerUserId}`;

    const admin = await createTestUser(adminUsername, `${adminUsername}@example.com`);
    adminUserId = admin.userId;
    adminToken = admin.token;
    await sql`UPDATE users SET is_admin = true WHERE id = ${adminUserId}`;
  });

  afterAll(async () => {
    await cleanUpUser(adminUserId);
    await cleanUpUser(ownerUserId);
    if (Object.keys(previousPolicy).length > 0) {
      await sql`
        UPDATE site_policy
        SET policy = ${JSON.stringify(previousPolicy)}::jsonb, updated_at = NOW()
        WHERE id = 1
      `;
      const { PostgresSitePolicyRepository } = await import(
        '@/common/infrastructure/repositories/postgres-site-policy.repository'
      );
      new PostgresSitePolicyRepository().invalidateCache();
    }
  });

  test('non-owner admin cannot update owner profile', async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/admin/users/${ownerUserId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          Giftistry: {
            User: { FirstName: 'Hacked' },
          },
        }),
      })
    );
    expect(res.status).toBe(403);
  });

  test('non-owner admin cannot reset owner password', async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/admin/users/${ownerUserId}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          Giftistry: {
            Password: { Password: 'newpassword123', ForcePasswordChange: true },
          },
        }),
      })
    );
    expect(res.status).toBe(403);
  });

  test('owner can update their own profile', async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/admin/users/${ownerUserId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({
          Giftistry: {
            User: { FirstName: 'OwnerSelf' },
          },
        }),
      })
    );
    expect(res.status).toBe(200);
    const [row] = await sql`SELECT first_name FROM users WHERE id = ${ownerUserId}`;
    expect(row.first_name).toBe('OwnerSelf');
  });
});
