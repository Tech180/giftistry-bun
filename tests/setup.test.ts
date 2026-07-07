import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import { app } from '../src/index';
import { sql } from '../src/common/database/connection';
import { testPassword } from './helper';
import * as fs from 'fs';
import * as path from 'path';

describe("Homelab Setup Wizard Endpoints", () => {
  const timestamp = Date.now();
  const setupAdminEmail = `setup_admin_${timestamp}@example.com`;
  const setupAdminUsername = `setup_admin_${timestamp}`;

  let originalConfig: string | null = null;
  const configPath = path.join(process.cwd(), 'config.json');

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
    expect(body.Result.initialized).toBe(false);
  });

  test("Run system setup and bootstrap admin", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/system/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Giftistry: {
            Setup: {
              dbType: "local",
              smtpType: "local",
              admin: {
                username: setupAdminUsername,
                email: setupAdminEmail,
                password: testPassword
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
    expect(body.Result.initialized).toBe(true);
  });

  test("Block subsequent setup attempts", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/system/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Giftistry: {
            Setup: {
              dbType: "local",
              smtpType: "local",
              admin: {
                username: "another_admin",
                email: "another@example.com",
                password: testPassword
              }
            }
          }
        })
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.Result.Message).toContain("System already setup");
  });
});
