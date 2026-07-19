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
