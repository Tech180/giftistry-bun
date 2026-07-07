import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { app } from '../src/index';
import { sql } from '../src/common/database/connection';

describe('Admin API', () => {
  const timestamp = Date.now();
  const adminEmail = `admin_api_${timestamp}@example.com`;
  const adminUsername = `admin_api_${timestamp}`;
  const userEmail = `user_api_${timestamp}@example.com`;
  const userUsername = `user_api_${timestamp}`;
  let adminUserId: string;
  let adminToken: string;
  let regularUserId: string;

  async function cleanUpUser(userId: string) {
    if (!userId) return;
    try {
      await sql`DELETE FROM users WHERE id = ${userId}`;
    } catch {
      // ignore
    }
  }

  beforeAll(async () => {
    const signupRes = await app.handle(
      new Request('http://localhost/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Giftistry: {
            Auth: {
              username: adminUsername,
              email: adminEmail,
              password: 'password123',
              firstName: 'Admin',
              lastName: 'User',
            },
          },
        }),
      })
    );
    const signupBody = await signupRes.json();
    adminUserId = signupBody.Result.User.Id;
    adminToken = signupBody.Result.Token;

    await sql`UPDATE users SET is_admin = true WHERE id = ${adminUserId}`;

    const userRes = await app.handle(
      new Request('http://localhost/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Giftistry: {
            Auth: {
              username: userUsername,
              email: userEmail,
              password: 'password123',
              firstName: 'Regular',
              lastName: 'User',
            },
          },
        }),
      })
    );
    const userBody = await userRes.json();
    regularUserId = userBody.Result.User.Id;
  });

  afterAll(async () => {
    await cleanUpUser(regularUserId);
    await cleanUpUser(adminUserId);
  });

  test('Non-admin cannot access admin overview', async () => {
    const [regular] = await sql`SELECT id FROM users WHERE id = ${regularUserId}`;
    const loginRes = await app.handle(
      new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Giftistry: { Auth: { email: userEmail, password: 'password123' } },
        }),
      })
    );
    const loginBody = await loginRes.json();
    const userToken = loginBody.Result.Token;

    const res = await app.handle(
      new Request('http://localhost/api/admin/overview', {
        headers: { Authorization: `Bearer ${userToken}` },
      })
    );
    expect(res.status).toBe(403);
    expect(regular).toBeTruthy();
  });

  test('Admin can load overview and user list', async () => {
    const overviewRes = await app.handle(
      new Request('http://localhost/api/admin/overview', {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
    );
    expect(overviewRes.status).toBe(200);
    const overviewBody = await overviewRes.json();
    expect(overviewBody.Result.Stats.Users.total).toBeGreaterThanOrEqual(2);

    const usersRes = await app.handle(
      new Request('http://localhost/api/admin/users', {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
    );
    expect(usersRes.status).toBe(200);
    const usersBody = await usersRes.json();
    expect(usersBody.Result.Users.length).toBeGreaterThanOrEqual(2);
  });

  test('Admin can update site policy and user policy', async () => {
    const siteRes = await app.handle(
      new Request('http://localhost/api/admin/site-policy', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          Giftistry: {
            SitePolicy: {
              registrationMode: 'open',
              requireEmailVerification: false,
              loginAttemptsBeforeLockout: 5,
              lockoutDurationMinutes: 0,
              maintenanceMode: false,
              maintenanceMessage: 'Maintenance',
              allowPasswordLogin: true,
              allowedEmailDomains: [],
              defaultUserPolicy: {
                canCreateWishlists: true,
                maxActiveWishlists: 0,
                canUseComments: true,
                canUseAiFeatures: true,
                canSharePublicLinks: true,
                canUploadImages: true,
                canSendFriendRequests: true,
                canUseCustomThemes: true,
              },
            },
          },
        }),
      })
    );
    expect(siteRes.status).toBe(200);

    const policyRes = await app.handle(
      new Request(`http://localhost/api/admin/users/${regularUserId}/policy`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          Giftistry: {
            Policy: {
              isHidden: true,
              policy: { canUseComments: true },
            },
          },
        }),
      })
    );
    expect(policyRes.status).toBe(200);

    const detailRes = await app.handle(
      new Request(`http://localhost/api/admin/users/${regularUserId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
    );
    const detailBody = await detailRes.json();
    expect(detailBody.Result.User.IsHidden).toBe(true);
  });
});
