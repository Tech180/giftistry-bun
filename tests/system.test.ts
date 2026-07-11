import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import { app } from '../src/index';
import { sql } from '../src/common/database/connection';
import { testPassword, cleanUpUser } from './helper';
import * as fs from 'fs';
import * as path from 'path';

describe("System Administration Settings Endpoints", () => {
  const timestamp = Date.now();
  const adminEmail = `system_admin_${timestamp}@example.com`;
  const adminUsername = `sys_admin_${timestamp}`;
  let adminUserId: string;
  let adminToken: string;

  const normalEmail = `system_user_${timestamp}@example.com`;
  const normalUsername = `sys_user_${timestamp}`;
  let normalUserId: string;
  let normalToken: string;

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
    await cleanUpUser(adminUserId);
    await cleanUpUser(normalUserId);
  });

  test("Bootstrap first user as Admin", async () => {
    // Empty test database so the first signup becomes admin.
    await sql`DELETE FROM user_passkeys`;
    await sql`DELETE FROM users`;

    const res = await app.handle(
      new Request("http://localhost/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Giftistry: {
            Auth: {
              Username: adminUsername,
              Email: adminEmail,
              Password: testPassword
            }
          }
        }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    adminUserId = body.Result.User.Id;
    adminToken = body.Result.Token;
    expect(body.Result.User.IsAdmin).toBe(true);
  });

  test("Subsequent user signup is not Admin", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Giftistry: {
            Auth: {
              Username: normalUsername,
              Email: normalEmail,
              Password: testPassword
            }
          }
        }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    normalUserId = body.Result.User.Id;
    normalToken = body.Result.Token;
    expect(body.Result.User.IsAdmin).toBe(false);
  });

  test("Admin user can fetch system settings", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/system/settings", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${adminToken}`
        }
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.Meta.Status).toBe("Success");
    expect(body.Result.DbType).toBe("local");
  });

  test("Normal user is forbidden from fetching system settings", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/system/settings", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${normalToken}`
        }
      })
    );
    expect(res.status).toBe(403);
  });

  test("Admin user can update system settings with local type", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/system/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          Giftistry: {
            System: {
              DbType: "local",
              SmtpType: "local"
            }
          }
        })
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.Meta.Status).toBe("Success");
  });

  test("Reject invalid remote database connection strings", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/system/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          Giftistry: {
            System: {
              DbType: "remote",
              DbUrl: "postgresql://invalid_user:invalid_pass@127.0.0.1:9999/invalid_db",
              SmtpType: "local"
            }
          }
        })
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.Result.Message).toContain("Failed to connect to the remote database");
  });

  test("Normal user is forbidden from testing AI connection", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/system/ai-check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${normalToken}`
        },
        body: JSON.stringify({
          Giftistry: {
            System: {
              AiProvider: "local",
              AiEndpoint: "http://127.0.0.1:59999/v1"
            }
          }
        })
      })
    );
    expect(res.status).toBe(403);
  });

  test("Admin local AI test fails for unreachable endpoint", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/system/ai-check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          Giftistry: {
            System: {
              AiProvider: "local",
              AiEndpoint: "http://127.0.0.1:59999/v1",
              AiModel: "llama3"
            }
          }
        })
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.Result.Message).toContain("Cannot reach AI server");
  });
});
