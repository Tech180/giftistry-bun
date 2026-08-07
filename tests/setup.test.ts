import { expect, test, describe, beforeAll, afterAll, beforeEach, afterEach } from "bun:test";
import { app } from '../src/index';
import { sql } from '../src/common/database/connection';
import { testPassword } from './helper';
import { getEnv, loadRuntimeConfig, setEnvForTests } from '../src/common/consts/env.consts';
import * as fs from 'fs';
import * as path from 'path';

describe("Homelab Setup Wizard Endpoints", () => {
  const timestamp = Date.now();
  const setupAdminUsername = `setup_admin_${timestamp}`;

  let originalConfig: string | null = null;
  const configPath = path.join(process.cwd(), 'config.json');

  const resetUninitializedConfig = () => {
    if (!fs.existsSync(configPath)) return;
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as Record<string, unknown>;
    config.AllowSetup = true;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  };

  beforeAll(async () => {
    if (fs.existsSync(configPath)) {
      originalConfig = fs.readFileSync(configPath, 'utf-8');
    }
  });

  afterAll(async () => {
    if (originalConfig !== null) {
      fs.writeFileSync(configPath, originalConfig, 'utf-8');
    } else if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
    }
    // Clean up created admin
    await sql`DELETE FROM users WHERE username = ${setupAdminUsername}`;
  });

  test("System status returns uninitialized when no users exist", async () => {
    // Simulates a fresh install on the isolated test database only.
    await sql`DELETE FROM user_passkeys`;
    await sql`DELETE FROM users`;

    const res = await app.handle(
      new Request("http://localhost/api/system/status", {
        method: "GET"
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.Meta.Status).toBe("Success");
    expect(body.Result.Initialized).toBe(false);
  });

  test("Run system setup and bootstrap admin", async () => {
    resetUninitializedConfig();
    const res = await app.handle(
      new Request("http://localhost/api/system/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Giftistry: {
            Setup: {
              DbType: "local",
              Admin: {
                Username: setupAdminUsername,
                Password: testPassword
              }
            }
          }
        })
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.Meta.Status).toBe("Success");

    // Verify admin is inserted and is indeed admin
    const [user] = await sql`SELECT is_admin, email_verified FROM users WHERE username = ${setupAdminUsername}`;
    expect(user.is_admin).toBe(true);
    expect(user.email_verified).toBe(true);
  });

  test("System status returns initialized after setup", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/system/status", {
        method: "GET"
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.Result.Initialized).toBe(true);
  });

  test("Block subsequent setup attempts", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/system/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Giftistry: {
            Setup: {
              DbType: "local",
              Admin: {
                Username: "another_admin",
                Password: testPassword
              }
            }
          }
        })
      })
    );
    expect(res.status).toBe(403);
    const body = await res.json() as any;
    expect(body.Result.Message).toContain("sealed");
  });
});

describe("Setup hardening", () => {
  const tokenTimestamp = Date.now();
  const tokenAdminUsername = `token_admin_${tokenTimestamp}`;
  const setupToken = `setup-token-${tokenTimestamp}`;
  const configPath = path.join(process.cwd(), 'config.json');
  let savedRuntimeConfig: ReturnType<typeof getEnv> | null = null;

  const resetUninitializedConfig = () => {
    if (!fs.existsSync(configPath)) return;
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as Record<string, unknown>;
    config.AllowSetup = true;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  };

  beforeEach(async () => {
    await sql`DELETE FROM user_passkeys`;
    await sql`DELETE FROM users`;
    resetUninitializedConfig();
  });

  afterEach(async () => {
    setEnvForTests(savedRuntimeConfig);
    savedRuntimeConfig = null;
    await sql`DELETE FROM users WHERE username = ${tokenAdminUsername}`;
  });

  test("Setup is blocked when GIFTISTRY_ALLOW_SETUP is false", async () => {
    savedRuntimeConfig = getEnv();
    setEnvForTests({
      ...loadRuntimeConfig(),
      GIFTISTRY_ALLOW_SETUP: false,
    });

    const res = await app.handle(
      new Request("http://localhost/api/system/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Giftistry: {
            Setup: {
              DbType: "local",
              Admin: {
                Username: tokenAdminUsername,
                Password: testPassword,
              },
            },
          },
        }),
      })
    );
    expect(res.status).toBe(403);
    const body = await res.json() as any;
    expect(body.Result.Message).toContain("Setup is disabled");
  });

  test("Setup requires matching token when GIFTISTRY_SETUP_TOKEN is set", async () => {
    savedRuntimeConfig = getEnv();
    setEnvForTests({
      ...loadRuntimeConfig(),
      GIFTISTRY_SETUP_TOKEN: setupToken,
    });

    const denied = await app.handle(
      new Request("http://localhost/api/system/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Giftistry: {
            Setup: {
              DbType: "local",
              Admin: {
                Username: tokenAdminUsername,
                Password: testPassword,
              },
            },
          },
        }),
      })
    );
    expect(denied.status).toBe(403);

    const allowed = await app.handle(
      new Request("http://localhost/api/system/setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Giftistry-Setup-Token": setupToken,
        },
        body: JSON.stringify({
          Giftistry: {
            Setup: {
              DbType: "local",
              SetupToken: setupToken,
              Admin: {
                Username: tokenAdminUsername,
                Password: testPassword,
              },
            },
          },
        }),
      })
    );
    expect(allowed.status).toBe(200);
  });
});

describe("Owner AllowSetup control", () => {
  const timestamp = Date.now();
  const ownerUsername = `allow_setup_owner_${timestamp}`;
  const nonOwnerAdminUsername = `allow_setup_admin_${timestamp}`;
  const configPath = path.join(process.cwd(), 'config.json');
  let originalConfig: string | null = null;
  let ownerToken: string;
  let ownerUserId: string;
  let nonOwnerAdminToken: string;
  let nonOwnerAdminUserId: string;

  const readAllowSetup = (): boolean | undefined => {
    if (!fs.existsSync(configPath)) return undefined;
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as Record<string, unknown>;
    return config.AllowSetup as boolean | undefined;
  };

  const settingsPayload = (extra: Record<string, unknown> = {}) =>
    JSON.stringify({
      Giftistry: {
        System: {
          DbType: 'local',
          SmtpType: 'local',
          ...extra,
        },
      },
    });

  beforeAll(async () => {
    if (fs.existsSync(configPath)) {
      originalConfig = fs.readFileSync(configPath, 'utf-8');
    }

    await sql`DELETE FROM user_passkeys`;
    await sql`DELETE FROM users`;

    const config = fs.existsSync(configPath)
      ? (JSON.parse(fs.readFileSync(configPath, 'utf-8')) as Record<string, unknown>)
      : {};
    config.AllowSetup = true;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

    const setupRes = await app.handle(
      new Request('http://localhost/api/system/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Giftistry: {
            Setup: {
              DbType: 'local',
              Admin: {
                Username: ownerUsername,
                Password: testPassword,
              },
            },
          },
        }),
      })
    );
    expect(setupRes.status).toBe(200);

    const loginRes = await app.handle(
      new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Giftistry: {
            Auth: {
              Username: ownerUsername,
              Password: testPassword,
            },
          },
        }),
      })
    );
    expect(loginRes.status).toBe(200);
    const loginBody = (await loginRes.json()) as any;
    ownerToken = loginBody.Result.Token;
    ownerUserId = loginBody.Result.User.Id;

    // Setup seals registration to invite_only — open it so we can create a second admin.
    const [policyRow] = await sql<{ policy: unknown }[]>`
      SELECT policy FROM site_policy WHERE id = 1
    `;
    const existingPolicy =
      typeof policyRow?.policy === 'string'
        ? JSON.parse(policyRow.policy)
        : ((policyRow?.policy as Record<string, unknown> | null) ?? {});
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

    const adminSignup = await app.handle(
      new Request('http://localhost/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Giftistry: {
            Auth: {
              Username: nonOwnerAdminUsername,
              Email: `${nonOwnerAdminUsername}@example.com`,
              Password: testPassword,
            },
          },
        }),
      })
    );
    expect(adminSignup.status).toBe(200);
    const adminBody = (await adminSignup.json()) as any;
    nonOwnerAdminUserId = adminBody.Result.User.Id;
    nonOwnerAdminToken = adminBody.Result.Token;
    await sql`UPDATE users SET is_admin = true, is_owner = false WHERE id = ${nonOwnerAdminUserId}`;
  });

  afterAll(async () => {
    if (originalConfig !== null) {
      fs.writeFileSync(configPath, originalConfig, 'utf-8');
    } else if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
    }
    if (ownerUserId) {
      await sql`DELETE FROM users WHERE id = ${ownerUserId}`;
    }
    if (nonOwnerAdminUserId) {
      await sql`DELETE FROM users WHERE id = ${nonOwnerAdminUserId}`;
    }
  });

  test("GET settings shows AllowSetup false after setup seals", async () => {
    expect(readAllowSetup()).toBe(false);

    const res = await app.handle(
      new Request('http://localhost/api/system/settings', {
        method: 'GET',
        headers: { Authorization: `Bearer ${ownerToken}` },
      })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.Result.AllowSetup).toBe(false);
  });

  test("Non-owner admin cannot update system settings", async () => {
    const res = await app.handle(
      new Request('http://localhost/api/system/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${nonOwnerAdminToken}`,
        },
        body: settingsPayload({ AllowSetup: true }),
      })
    );
    expect(res.status).toBe(403);
    expect(readAllowSetup()).toBe(false);
  });

  test("Non-owner admin cannot fetch system settings", async () => {
    const res = await app.handle(
      new Request('http://localhost/api/system/settings', {
        method: 'GET',
        headers: { Authorization: `Bearer ${nonOwnerAdminToken}` },
      })
    );
    expect(res.status).toBe(403);
  });

  test("Omitting AllowSetup leaves seal unchanged", async () => {
    const res = await app.handle(
      new Request('http://localhost/api/system/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerToken}`,
        },
        body: settingsPayload(),
      })
    );
    expect(res.status).toBe(200);
    expect(readAllowSetup()).toBe(false);
  });

  test("Owner can unseal AllowSetup", async () => {
    const res = await app.handle(
      new Request('http://localhost/api/system/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerToken}`,
        },
        body: settingsPayload({ AllowSetup: true }),
      })
    );
    expect(res.status).toBe(200);
    expect(readAllowSetup()).toBe(true);

    const getRes = await app.handle(
      new Request('http://localhost/api/system/settings', {
        method: 'GET',
        headers: { Authorization: `Bearer ${ownerToken}` },
      })
    );
    const body = (await getRes.json()) as any;
    expect(body.Result.AllowSetup).toBe(true);
  });

  test("Delete server wipes users and reopens AllowSetup", async () => {
    // Seal again first so reopen is meaningful
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        {
          ...(fs.existsSync(configPath)
            ? JSON.parse(fs.readFileSync(configPath, 'utf-8'))
            : {}),
          AllowSetup: false,
        },
        null,
        2
      ),
      'utf-8'
    );

    const res = await app.handle(
      new Request('http://localhost/api/system/delete-server', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({ Giftistry: { Server: {} } }),
      })
    );
    expect(res.status).toBe(200);
    expect(readAllowSetup()).toBe(true);

    const [countRow] = await sql`SELECT COUNT(*)::integer as count FROM users`;
    expect(countRow.count).toBe(0);

    const statusRes = await app.handle(
      new Request('http://localhost/api/system/status', { method: 'GET' })
    );
    expect(statusRes.status).toBe(200);
    const statusBody = (await statusRes.json()) as any;
    expect(statusBody.Result.Initialized).toBe(false);
    expect(statusBody.Result.AllowSetup).toBe(true);
  });
});
