import { expect, test, describe, afterAll } from "bun:test";
import { app } from '../src/index';
import { sql } from '../src/common/database/connection';
import { testPassword, cleanUpUser } from './helper';

describe("Authentication & Global Endpoints", () => {
  const timestamp = Date.now();
  const testEmail = `auth_test_${timestamp}@example.com`;
  const testUsername = `auth_user_${timestamp}`;
  let userId: string;
  let token: string;

  afterAll(async () => {
    await cleanUpUser(userId);
  });

  test("Signup a new user with progressive profiling", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Giftistry: {
            Auth: {
              username: testUsername,
              email: testEmail,
              password: testPassword
            }
          }
        }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.Meta.Status).toBe("Success");
    expect(body.Result.User.FirstName).toBe("");
    expect(body.Result.User.LastName).toBe("");
    
    token = body.Result.Token;
    userId = body.Result.User.Id;

    // Update names
    const profileRes = await app.handle(
      new Request("http://localhost/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          Giftistry: {
            Auth: {
              firstName: "Test",
              lastName: "User"
            }
          }
        }),
      })
    );
    expect(profileRes.status).toBe(200);
  });

  test("Get /api/auth/me (Bearer Token) returns sanitized user profile", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/auth/me", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.Result.User.Id).toBe(userId);
    expect(body.Result.User.Email).toBe(testEmail);
    expect(body.Result.User.Username).toBe(testUsername);
    expect(body.Result.User.AuthHash).toBeUndefined();
  });

  test("Login returns Set-Cookie and body without AuthHash", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Giftistry: {
            Auth: {
              email: testEmail,
              password: testPassword
            }
          }
        })
      })
    );
    expect(res.status).toBe(200);
    
    const setCookie = res.headers.get("Set-Cookie");
    expect(setCookie).not.toBeNull();
    expect(setCookie).toContain("jwt=");
    expect(setCookie).toContain("HttpOnly");

    const body = await res.json() as any;
    expect(body.Result.User.Id).toBe(userId);
    expect(body.Result.User.AuthHash).toBeUndefined();
  });

  test("Fetch /api/auth/me using Cookie", async () => {
    const loginRes = await app.handle(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Giftistry: {
            Auth: {
              email: testEmail,
              password: testPassword
            }
          }
        })
      })
    );
    const cookie = loginRes.headers.get("Set-Cookie") || "";
    const jwtCookie = cookie.split(";")[0] || "";

    const meRes = await app.handle(
      new Request("http://localhost/api/auth/me", {
        method: "GET",
        headers: {
          "Cookie": jwtCookie
        }
      })
    );
    expect(meRes.status).toBe(200);
    const body = await meRes.json() as any;
    expect(body.Result.User.Id).toBe(userId);
    expect(body.Result.User.AuthHash).toBeUndefined();
  });

  test("Logout clears the jwt cookie", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/auth/logout", {
        method: "POST"
      })
    );
    expect(res.status).toBe(200);
    const setCookie = res.headers.get("Set-Cookie");
    expect(setCookie).not.toBeNull();
    expect(setCookie).toContain("Max-Age=0");
  });

  test("Fetch /api/auth/me without credentials is unauthorized", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/auth/me", {
        method: "GET"
      })
    );
    expect(res.status).toBe(401);
  });

  test("Rate limiter blocks request after 5 attempts", async () => {
    for (let i = 0; i < 5; i++) {
      const res = await app.handle(
        new Request("http://localhost/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Test-Rate-Limit": "true"
          },
          body: JSON.stringify({
            Giftistry: {
              Auth: {
                email: "invalid_rate_limit_test@example.com",
                password: "wrongpassword"
              }
            }
          })
        })
      );
      expect(res.status).toBe(401);
    }

    const res6 = await app.handle(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Test-Rate-Limit": "true"
        },
          body: JSON.stringify({
            Giftistry: {
              Auth: {
                email: "invalid_rate_limit_test@example.com",
                password: "wrongpassword"
              }
            }
          })
      })
    );
    expect(res6.status).toBe(429);
  });

  test("Fetch Swagger JSON returns valid OpenAPI specification", async () => {
    const res = await app.handle(
      new Request("http://localhost/docs/json", {
        method: "GET"
      })
    );
    expect(res.status).toBe(200);
    const spec = await res.json();
    expect(spec.openapi).toContain("3.");
    expect(spec.paths["/api/auth/signup"]).toBeDefined();
  });

  test("Public user preview profile endpoint", async () => {
    const updateRes = await app.handle(
      new Request("http://localhost/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          Giftistry: {
            Auth: {
              username: testUsername,
              bio: "I love mechanical keyboards.",
              theme: "neon",
              avatar: "owner_avatar_url"
            }
          }
        })
      })
    );
    expect(updateRes.status).toBe(200);

    const previewRes = await app.handle(
      new Request(`http://localhost/api/users/${userId}/preview`, {
        method: "GET"
      })
    );
    expect(previewRes.status).toBe(200);
    const body = await previewRes.json() as any;
    expect(body.Result.User.Username).toBe(testUsername);
    expect(body.Result.User.Bio).toBe("I love mechanical keyboards.");
  });

  test("Dynamic stylesheet serving endpoint", async () => {
    const resStatic = await app.handle(
      new Request("http://localhost/api/themes/cyberpunk/dark/css", {
        method: "GET"
      })
    );
    expect(resStatic.status).toBe(200);
    expect(resStatic.headers.get("Content-Type")).toBe("text/css");

    const resDynamic = await app.handle(
      new Request("http://localhost/api/themes/user-theme-999/dark/css", {
        method: "GET"
      })
    );
    expect(resDynamic.status).toBe(200);
    expect(resDynamic.headers.get("Content-Type")).toBe("text/css");
  });

  test("Email Verification Flow & Restriction", async () => {
    // 1. Signup a new test user (will be unverified by default)
    const timestamp2 = Date.now() + 1;
    const unverifiedEmail = `unverified_${timestamp2}@example.com`;
    const unverifiedUsername = `unverified_${timestamp2}`;
    
    const signupRes = await app.handle(
      new Request("http://localhost/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Giftistry: {
            Auth: {
              username: unverifiedUsername,
              email: unverifiedEmail,
              password: testPassword
            }
          }
        }),
      })
    );
    expect(signupRes.status).toBe(200);
    const signupBody = await signupRes.json() as any;
    const unverifiedToken = signupBody.Result.Token;
    const unverifiedUserId = signupBody.Result.User.Id;

    // 2. Try to create a wishlist: should be Forbidden 403
    const createWishlistRes = await app.handle(
      new Request("http://localhost/api/wishlists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${unverifiedToken}`
        },
        body: JSON.stringify({
          Giftistry: {
            Lists: {
              title: "Unverified Wishlist",
              category: "generic",
              revealSuggestions: true
            }
          }
        })
      })
    );
    expect(createWishlistRes.status).toBe(403);
    const errBody = await createWishlistRes.json() as any;
    expect(errBody.Result.Message).toContain("verify your email");

    // 3. Fetch verification token from DB
    const [dbUser] = await sql<any[]>`SELECT email_verification_token FROM users WHERE id = ${unverifiedUserId}`;
    const verificationToken = dbUser.email_verification_token;
    expect(verificationToken).not.toBeNull();

    // 4. Verify email via endpoint
    const verifyRes = await app.handle(
      new Request("http://localhost/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Giftistry: {
            Auth: {
              token: verificationToken
            }
          }
        })
      })
    );
    expect(verifyRes.status).toBe(200);

    // 5. Try creating wishlist again: should succeed now!
    const createWishlistRes2 = await app.handle(
      new Request("http://localhost/api/wishlists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${unverifiedToken}`
        },
        body: JSON.stringify({
          Giftistry: {
            Lists: {
              title: "Verified Wishlist",
              category: "generic",
              revealSuggestions: true
            }
          }
        })
      })
    );
    expect(createWishlistRes2.status).toBe(200);
    const listBody = await createWishlistRes2.json() as any;
    const wishlistId = listBody.Result.Id;

    // Cleanup
    if (wishlistId) {
      await sql`DELETE FROM lists WHERE id = ${wishlistId}`;
    }
    await cleanUpUser(unverifiedUserId);
  });

  test("TOTP 2FA Flow (Setup, Enable, Login, Disable)", async () => {
    // 1. Setup 2FA
    const setupRes = await app.handle(
      new Request("http://localhost/api/auth/2fa/setup", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })
    );
    expect(setupRes.status).toBe(200);
    const setupBody = await setupRes.json() as any;
    const secret = setupBody.Result.Secret;
    expect(secret).toBeDefined();
    expect(setupBody.Result.QrCodeUrl).toBeDefined();

    // 2. Generate code and enable 2FA
    const { generateSync } = require("otplib");
    const code = generateSync({ secret });

    const enableRes = await app.handle(
      new Request("http://localhost/api/auth/2fa/enable", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          Giftistry: {
            Auth: {
              secret,
              code
            }
          }
        })
      })
    );
    expect(enableRes.status).toBe(200);
    const enableBody = await enableRes.json() as any;
    const recoveryCodes = enableBody.Result.RecoveryCodes;
    expect(recoveryCodes).toBeDefined();
    expect(recoveryCodes.length).toBe(8);

    // 3. Attempt standard login: should require 2FA and return ticket
    const loginRes = await app.handle(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Giftistry: {
            Auth: {
              email: testEmail,
              password: testPassword
            }
          }
        })
      })
    );
    expect(loginRes.status).toBe(200);
    const loginBody = await loginRes.json() as any;
    expect(loginBody.Result.Require2FA).toBe(true);
    const ticket = loginBody.Result.Ticket;
    expect(ticket).toBeDefined();

    // 4. Verify 2FA Login
    const loginCode = generateSync({ secret });
    const verify2faRes = await app.handle(
      new Request("http://localhost/api/auth/2fa/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Giftistry: {
            Auth: {
              ticket,
              code: loginCode
            }
          }
        })
      })
    );
    expect(verify2faRes.status).toBe(200);
    const verifyBody = await verify2faRes.json() as any;
    expect(verifyBody.Result.User.Id).toBe(userId);

    // 4b. Verify Recovery Code Login
    // Initiate login again to get a new 2FA ticket
    const loginRes2 = await app.handle(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Giftistry: {
            Auth: {
              email: testEmail,
              password: testPassword
            }
          }
        })
      })
    );
    expect(loginRes2.status).toBe(200);
    const loginBody2 = await loginRes2.json() as any;
    const ticket2 = loginBody2.Result.Ticket;

    // Use the first recovery code to login
    const recoveryCode = recoveryCodes[0];
    const verifyRecoveryRes = await app.handle(
      new Request("http://localhost/api/auth/2fa/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Giftistry: {
            Auth: {
              ticket: ticket2,
              code: recoveryCode
            }
          }
        })
      })
    );
    expect(verifyRecoveryRes.status).toBe(200);
    const verifyRecoveryBody = await verifyRecoveryRes.json() as any;
    expect(verifyRecoveryBody.Result.User.Id).toBe(userId);

    // 4c. Verify that the used recovery code has been consumed
    // Initiate login to get a third ticket
    const loginRes3 = await app.handle(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Giftistry: {
            Auth: {
              email: testEmail,
              password: testPassword
            }
          }
        })
      })
    );
    expect(loginRes3.status).toBe(200);
    const loginBody3 = await loginRes3.json() as any;
    const ticket3 = loginBody3.Result.Ticket;

    // Attempting to reuse the same recovery code should fail (unauthorized/invalid 2FA code)
    const verifyRecoveryRes2 = await app.handle(
      new Request("http://localhost/api/auth/2fa/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Giftistry: {
            Auth: {
              ticket: ticket3,
              code: recoveryCode
            }
          }
        })
      })
    );
    expect(verifyRecoveryRes2.status).toBe(401);

    // 5. Disable 2FA
    const disableCode = generateSync({ secret });
    const disableRes = await app.handle(
      new Request("http://localhost/api/auth/2fa/disable", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          Giftistry: {
            Auth: {
              code: disableCode
            }
          }
        })
      })
    );
    expect(disableRes.status).toBe(200);
  });
});

