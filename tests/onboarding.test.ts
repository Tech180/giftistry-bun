import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { app } from '../src/index';
import { loadConfig, saveConfig, sql } from '../src/common/database/connection';

describe('Owner onboarding', () => {
  const timestamp = Date.now();
  const ownerUsername = `owner_ob_${timestamp}`;
  const ownerEmail = `owner_ob_${timestamp}@example.com`;
  const adminUsername = `admin_ob_${timestamp}`;
  const adminEmail = `admin_ob_${timestamp}@example.com`;
  const regularUsername = `user_ob_${timestamp}`;
  const regularEmail = `user_ob_${timestamp}@example.com`;

  let ownerUserId = '';
  let ownerToken = '';
  let adminUserId = '';
  let adminToken = '';
  let regularUserId = '';
  let regularToken = '';
  let previousConfig: ReturnType<typeof loadConfig> | null = null;
  let previousRegistrationMode: string | null = null;

  async function cleanUpUser(userId: string) {
    if (!userId) return;
    try {
      await sql`DELETE FROM users WHERE id = ${userId}`;
    } catch {
      // ignore
    }
  }

  async function signup(username: string, email: string) {
    const res = await app.handle(
      new Request('http://localhost/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Giftistry: {
            Auth: {
              Username: username,
              Email: email,
              Password: 'password123',
              FirstName: 'Test',
              LastName: 'User',
            },
          },
        }),
      })
    );
    const body = await res.json();
    return { res, body };
  }

  beforeAll(async () => {
    previousConfig = { ...loadConfig() };
    saveConfig({
      ...previousConfig,
      OwnerOnboardingCompleted: false,
      AdminOnboardingCompleted: undefined,
    });

    // Ensure public signup works for test user creation (default policy is invite_only).
    const [policyRow] = await sql<{ policy: unknown }[]>`
      SELECT policy FROM site_policy WHERE id = 1
    `;
    const existingPolicy =
      typeof policyRow?.policy === 'string'
        ? JSON.parse(policyRow.policy)
        : (policyRow?.policy as Record<string, unknown> | null) ?? {};
    await sql`
      INSERT INTO site_policy (id, policy, updated_at)
      VALUES (
        1,
        ${JSON.stringify({ ...existingPolicy, RegistrationMode: 'open' })}::jsonb,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (id) DO UPDATE SET
        policy = ${JSON.stringify({ ...existingPolicy, RegistrationMode: 'open' })}::jsonb,
        updated_at = CURRENT_TIMESTAMP
    `;
    const { PostgresSitePolicyRepository } = await import(
      '@/common/infrastructure/postgres-site-policy.repository'
    );
    new PostgresSitePolicyRepository().invalidateCache();

    const owner = await signup(ownerUsername, ownerEmail);
    ownerUserId = owner.body.Result.User.Id;
    ownerToken = owner.body.Result.Token;
    await sql`UPDATE users SET is_admin = true, is_owner = true WHERE id = ${ownerUserId}`;

    const admin = await signup(adminUsername, adminEmail);
    adminUserId = admin.body.Result.User.Id;
    adminToken = admin.body.Result.Token;
    await sql`UPDATE users SET is_admin = true, is_owner = false WHERE id = ${adminUserId}`;

    const regular = await signup(regularUsername, regularEmail);
    regularUserId = regular.body.Result.User.Id;
    regularToken = regular.body.Result.Token;
    await sql`UPDATE users SET is_admin = false, is_owner = false WHERE id = ${regularUserId}`;

    const policyRes = await app.handle(
      new Request('http://localhost/api/admin/site-policy', {
        method: 'GET',
        headers: { Authorization: `Bearer ${ownerToken}` },
      })
    );
    const policyBody = await policyRes.json();
    previousRegistrationMode = policyBody.Result?.Policy?.RegistrationMode ?? 'invite_only';
  });

  afterAll(async () => {
    if (previousConfig) {
      saveConfig(previousConfig);
    }
    if (previousRegistrationMode && ownerToken) {
      await app.handle(
        new Request('http://localhost/api/admin/site-policy', {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${ownerToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            Giftistry: {
              SitePolicy: { RegistrationMode: previousRegistrationMode },
            },
          }),
        })
      );
    }
    await cleanUpUser(regularUserId);
    await cleanUpUser(adminUserId);
    await cleanUpUser(ownerUserId);
  });

  test('GET /onboarding: owner requires owner onboarding when incomplete', async () => {
    saveConfig({
      ...loadConfig(),
      OwnerOnboardingCompleted: false,
      AdminOnboardingCompleted: undefined,
    });

    const res = await app.handle(
      new Request('http://localhost/api/auth/onboarding', {
        headers: { Authorization: `Bearer ${ownerToken}` },
      })
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.Result.RequiresOwnerOnboarding).toBe(true);
    expect(body.Result.OwnerSteps.length).toBeGreaterThan(0);
  });

  test('GET /onboarding: non-owner admin does not require owner onboarding', async () => {
    saveConfig({
      ...loadConfig(),
      OwnerOnboardingCompleted: false,
      AdminOnboardingCompleted: undefined,
    });

    const res = await app.handle(
      new Request('http://localhost/api/auth/onboarding', {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.Result.RequiresOwnerOnboarding).toBe(false);
    expect(body.Result.OwnerSteps).toEqual([]);
  });

  test('non-owner cannot CompleteOwner', async () => {
    saveConfig({
      ...loadConfig(),
      OwnerOnboardingCompleted: false,
      AdminOnboardingCompleted: undefined,
    });

    const res = await app.handle(
      new Request('http://localhost/api/auth/onboarding', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${regularToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          Giftistry: {
            Onboarding: {
              CompleteOwner: true,
              SkipOwner: true,
            },
          },
        }),
      })
    );
    expect(res.status).toBe(403);
  });

  test('owner can CompleteOwner with skip', async () => {
    saveConfig({
      ...loadConfig(),
      OwnerOnboardingCompleted: false,
      AdminOnboardingCompleted: undefined,
    });

    const res = await app.handle(
      new Request('http://localhost/api/auth/onboarding', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${ownerToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          Giftistry: {
            Onboarding: {
              CompleteOwner: true,
              SkipOwner: true,
            },
          },
        }),
      })
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.Result.OwnerOnboardingCompleted).toBe(true);
    expect(body.Result.RequiresOwnerOnboarding).toBe(false);
    expect(loadConfig().OwnerOnboardingCompleted).toBe(true);
  });

  test('signup is forbidden when RegistrationMode is invite_only', async () => {
    const policyGet = await app.handle(
      new Request('http://localhost/api/admin/site-policy', {
        headers: { Authorization: `Bearer ${ownerToken}` },
      })
    );
    const current = await policyGet.json();
    const policy = current.Result.Policy;

    await app.handle(
      new Request('http://localhost/api/admin/site-policy', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${ownerToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          Giftistry: {
            SitePolicy: {
              ...policy,
              RegistrationMode: 'invite_only',
            },
          },
        }),
      })
    );

    const blocked = await signup(`blocked_${timestamp}`, `blocked_${timestamp}@example.com`);
    expect(blocked.res.status).toBe(403);

    await app.handle(
      new Request('http://localhost/api/admin/site-policy', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${ownerToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          Giftistry: {
            SitePolicy: {
              ...policy,
              RegistrationMode: previousRegistrationMode ?? 'open',
            },
          },
        }),
      })
    );
  });
});
