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
              Username: testUsername,
              Email: testEmail,
              Password: testPassword
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
              FirstName: "Test",
              LastName: "User"
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

  test("Profile AiEnabled preference persists on update and /me", async () => {
    const disableRes = await app.handle(
      new Request("http://localhost/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          Giftistry: {
            Auth: {
              AiEnabled: false
            }
          }
        }),
      })
    );
    expect(disableRes.status).toBe(200);
    const disableBody = await disableRes.json() as any;
    expect(disableBody.Result.User.AiEnabled).toBe(false);

    const meRes = await app.handle(
      new Request("http://localhost/api/auth/me", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })
    );
    expect(meRes.status).toBe(200);
    const meBody = await meRes.json() as any;
    expect(meBody.Result.User.AiEnabled).toBe(false);

    await app.handle(
      new Request("http://localhost/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          Giftistry: {
            Auth: {
              AiEnabled: true
            }
          }
        }),
      })
    );
  });

  test("Login returns Set-Cookie and body without AuthHash", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Giftistry: {
            Auth: {
              Email: testEmail,
              Password: testPassword
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
              Email: testEmail,
              Password: testPassword
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
                Email: "invalid_rate_limit_test@example.com",
                Password: "wrongpassword"
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
                Email: "invalid_rate_limit_test@example.com",
                Password: "wrongpassword"
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
              Username: testUsername,
              Bio: "I love mechanical keyboards.",
              Theme: "neon",
              Avatar: "hsl(200, 70%, 45%)"
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
    expect(resStatic.headers.get("ETag")).toMatch(/^W\/"/);
    expect(resStatic.headers.get("Cache-Control")).toBe("public, max-age=60");

    const etag = resStatic.headers.get("ETag");
    const res304 = await app.handle(
      new Request("http://localhost/api/themes/cyberpunk/dark/css", {
        method: "GET",
        headers: { "If-None-Match": etag! }
      })
    );
    expect(res304.status).toBe(304);
    expect(res304.headers.get("ETag")).toBe(etag);

    const resIndependence = await app.handle(
      new Request("http://localhost/api/themes/independence/light/css", {
        method: "GET"
      })
    );
    expect(resIndependence.status).toBe(200);
    const independenceCss = await resIndependence.text();
    expect(independenceCss).toContain("--theme-primary: #d62828");
    expect(independenceCss).not.toContain("#ff00ff");

    const resMatrix = await app.handle(
      new Request("http://localhost/api/themes/matrix/dark/css", {
        method: "GET"
      })
    );
    expect(resMatrix.status).toBe(200);
    const matrixCss = await resMatrix.text();
    expect(matrixCss).toContain("--theme-primary: #00ff41");
    expect(matrixCss).not.toContain("#ff00ff");

    const resPaperMario = await app.handle(
      new Request("http://localhost/api/themes/paper-mario/light/css", {
        method: "GET"
      })
    );
    expect(resPaperMario.status).toBe(200);
    const paperMarioCss = await resPaperMario.text();
    expect(paperMarioCss).toContain("--theme-bg: #87CEEB");
    expect(paperMarioCss).toContain("--theme-primary: #E3001B");
    expect(paperMarioCss).not.toContain("#ff00ff");

    const resDynamic = await app.handle(
      new Request("http://localhost/api/themes/user-theme-999/dark/css", {
        method: "GET"
      })
    );
    expect(resDynamic.status).toBe(200);
    expect(resDynamic.headers.get("Content-Type")).toBe("text/css");
    expect(resDynamic.headers.get("ETag")).toMatch(/^W\/"/);
    expect(resDynamic.headers.get("Cache-Control")).toBe("public, max-age=60");
  });

  test("Core stylesheet serving endpoint with caching", async () => {
    const resCore = await app.handle(
      new Request("http://localhost/api/themes/core/css", {
        method: "GET"
      })
    );
    expect(resCore.status).toBe(200);
    expect(resCore.headers.get("Content-Type")).toBe("text/css");
    expect(resCore.headers.get("ETag")).toMatch(/^W\/"/);
    expect(resCore.headers.get("Cache-Control")).toBe("public, max-age=60");

    const etag = resCore.headers.get("ETag");
    const res304 = await app.handle(
      new Request("http://localhost/api/themes/core/css", {
        method: "GET",
        headers: { "If-None-Match": etag! }
      })
    );
    expect(res304.status).toBe(304);
    expect(res304.headers.get("ETag")).toBe(etag);
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
              Username: unverifiedUsername,
              Email: unverifiedEmail,
              Password: testPassword
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
              Title: "Unverified Wishlist",
              Category: "generic",
              RevealSuggestions: true
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
              Token: verificationToken
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
              Title: "Verified Wishlist",
              Category: "generic",
              RevealSuggestions: true
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
              Secret: secret,
              Code: code
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
              Email: testEmail,
              Password: testPassword
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
              Ticket: ticket,
              Code: loginCode
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
              Email: testEmail,
              Password: testPassword
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
              Ticket: ticket2,
              Code: recoveryCode
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
              Email: testEmail,
              Password: testPassword
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
              Ticket: ticket3,
              Code: recoveryCode
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
              Code: disableCode
            }
          }
        })
      })
    );
    expect(disableRes.status).toBe(200);
  });

  test("Custom Themes Database Sync & CSS Serving", async () => {
    // 1. Get custom themes (initially empty)
    const getRes1 = await app.handle(
      new Request("http://localhost/api/themes/custom", {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
      })
    );
    expect(getRes1.status).toBe(200);
    const getBody1 = await getRes1.json() as any;
    expect(getBody1.Result.Themes.length).toBe(0);

    // 2. Create a custom theme
    const themeId = "custom-test-12345";
    const postRes = await app.handle(
      new Request("http://localhost/api/themes/custom", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          Giftistry: {
            Theme: {
              Id: themeId,
              Name: "Super Custom Theme",
              Colors: {
                Primary: "#112233",
                Bg: "#445566",
                Surface: "#778899",
                Border: "#aabbcc",
                Text: "#ddeeff"
              },
              Advanced: {
                Radius: { Default: "15px" }
              }
            }
          }
        })
      })
    );
    expect(postRes.status).toBe(200);
    const postBody = await postRes.json() as any;
    expect(postBody.Result.Theme.Name).toBe("Super Custom Theme");

    // 3. Get custom themes again (contains our new theme)
    const getRes2 = await app.handle(
      new Request("http://localhost/api/themes/custom", {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
      })
    );
    expect(getRes2.status).toBe(200);
    const getBody2 = await getRes2.json() as any;
    expect(getBody2.Result.Themes.length).toBe(1);
    expect(getBody2.Result.Themes[0].Id).toBe(themeId);

    // 4. Test compiler served stylesheet for custom theme ID
    const cssRes = await app.handle(
      new Request(`http://localhost/api/themes/${themeId}/dark/css`, {
        method: "GET"
      })
    );
    expect(cssRes.status).toBe(200);
    expect(cssRes.headers.get("Content-Type")).toBe("text/css");
    const cssContent = await cssRes.text();
    expect(cssContent).toContain("--theme-primary: #112233");
    expect(cssContent).toContain("--theme-bg: #445566");
    expect(cssContent).toContain("--theme-radius: 0.9375rem");

    // 5. Delete custom theme
    const deleteRes = await app.handle(
      new Request(`http://localhost/api/themes/custom/${themeId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      })
    );
    expect(deleteRes.status).toBe(200);

    // 6. Get custom themes (empty again)
    const getRes3 = await app.handle(
      new Request("http://localhost/api/themes/custom", {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
      })
    );
    expect(getRes3.status).toBe(200);
    const getBody3 = await getRes3.json() as any;
    expect(getBody3.Result.Themes.length).toBe(0);
  });
});

