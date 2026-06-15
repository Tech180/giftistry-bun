import { expect, test, describe, afterAll } from "bun:test";
import { sql } from './common/database/connection';
import { app } from './index';

describe("Giftistry Integration Tests", () => {
  // Owner info
  let ownerToken: string;
  let ownerUserId: string;
  const ownerEmail = `owner_${Date.now()}@example.com`;
  const ownerUsername = `owner_${Date.now()}`;

  // Collaborator info
  let collaboratorToken: string;
  let collaboratorUserId: string;
  const collaboratorEmail = `collaborator_${Date.now()}@example.com`;
  const collaboratorUsername = `collab_${Date.now()}`;

  // Unrelated user info
  let unrelatedToken: string;
  let unrelatedUserId: string;
  const unrelatedEmail = `unrelated_${Date.now()}@example.com`;
  const unrelatedUsername = `unrelated_${Date.now()}`;

  const testPassword = "securepassword123";
  let listId: string;
  let itemId: string;
  let secretItemId: string;

  // Clean up database after tests
  afterAll(async () => {
    if (ownerUserId) {
      await sql`DELETE FROM users WHERE id = ${ownerUserId}`;
    }
    if (collaboratorUserId) {
      await sql`DELETE FROM users WHERE id = ${collaboratorUserId}`;
    }
    if (unrelatedUserId) {
      await sql`DELETE FROM users WHERE id = ${unrelatedUserId}`;
    }
  });

  test("1. Sign up Owner (with progressive profiling)", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Giftistry: {
            Auth: {
              username: ownerUsername,
              email: ownerEmail,
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
    
    ownerToken = body.Result.Token;
    ownerUserId = body.Result.User.Id;

    // Onboard profile names
    const profileRes = await app.handle(
      new Request("http://localhost/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${ownerToken}`
        },
        body: JSON.stringify({
          Giftistry: {
            Auth: {
              firstName: "John",
              lastName: "Doe"
            }
          }
        }),
      })
    );
    expect(profileRes.status).toBe(200);
  });

  test("2. Sign up Collaborator", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Giftistry: {
            Auth: {
              username: collaboratorUsername,
              email: collaboratorEmail,
              password: testPassword
            }
          }
        }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    collaboratorToken = body.Result.Token;
    collaboratorUserId = body.Result.User.Id;
  });

  test("3. Sign up Unrelated User", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Giftistry: {
            Auth: {
              username: unrelatedUsername,
              email: unrelatedEmail,
              password: testPassword
            }
          }
        }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    unrelatedToken = body.Result.Token;
    unrelatedUserId = body.Result.User.Id;
  });

  test("4. Owner creates a Wishlist", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/wishlists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${ownerToken}`
        },
        body: JSON.stringify({
          Giftistry: {
            Lists: {
              title: "My Birthday Wishlist",
              expiresAt: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
              allowGroupFunds: true
            }
          }
        }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.Result.Title).toBe("My Birthday Wishlist");
    listId = body.Result.Id;
  });

  test("5. Unrelated user access is forbidden", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/items`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${unrelatedToken}`
        }
      })
    );
    expect(res.status).toBe(403);
  });

  test("6. Owner shares wishlist with Collaborator", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/shares`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${ownerToken}`
        },
        body: JSON.stringify({
          Giftistry: {
            Lists: {
              email: collaboratorEmail,
              role: "collaborator"
            }
          }
        }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.Result.Role).toBe("collaborator");
  });

  test("7. Owner adds standard item to list", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${ownerToken}`
        },
        body: JSON.stringify({
          Giftistry: {
            Items: {
              name: "PlayStation 5 Pro",
              description: "For gaming",
              isHiddenIdea: false
            }
          }
        }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.Result.Name).toBe("PlayStation 5 Pro");
    expect(body.Result.SuggestedByUserId).toBe(ownerUserId);
    itemId = body.Result.Id;
  });

  test("8. Owner cannot add hidden ideas to their own list", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${ownerToken}`
        },
        body: JSON.stringify({
          Giftistry: {
            Items: {
              name: "Secret Surprise",
              isHiddenIdea: true
            }
          }
        }),
      })
    );
    expect(res.status).toBe(403);
  });

  test("9. Collaborator adds a hidden idea (surprise) to the list", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${collaboratorToken}`
        },
        body: JSON.stringify({
          Giftistry: {
            Items: {
              name: "Secret Book",
              description: "Surprise book!",
              isHiddenIdea: true
            }
          }
        }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.Result.Name).toBe("Secret Book");
    expect(body.Result.SuggestedByUserId).toBe(collaboratorUserId);
    secretItemId = body.Result.Id;
  });

  test("10. Collaborator adds link to standard item", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/items/${itemId}/links`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${collaboratorToken}`
        },
        body: JSON.stringify({
          Giftistry: {
            Items: {
              url: "https://www.amazon.com/PlayStation-5-Pro"
            }
          }
        }),
      })
    );
    expect(res.status).toBe(200);
  });

  test("11. Collaborator claims standard item", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/items/${itemId}/claims`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${collaboratorToken}`
        },
        body: JSON.stringify({
          Giftistry: {
            Items: {
              amount: 50.00,
              claimedByName: "Santa Claus"
            }
          }
        }),
      })
    );
    expect(res.status).toBe(200);
  });

  test("12. Owner cannot claim items on their own list", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/items/${itemId}/claims`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${ownerToken}`
        },
        body: JSON.stringify({
          Giftistry: {
            Items: {
              amount: 10.00
            }
          }
        }),
      })
    );
    expect(res.status).toBe(403);
  });

  test("13. Collaborator leaves surprise comment (non-owner visible)", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${collaboratorToken}`
        },
        body: JSON.stringify({
          Giftistry: {
            Comments: {
              content: "Surprise gift discussion!",
              isOwnerVisible: false
            }
          }
        }),
      })
    );
    expect(res.status).toBe(200);
  });

  test("14. Owner cannot post non-owner visible comments", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${ownerToken}`
        },
        body: JSON.stringify({
          Giftistry: {
            Comments: {
              content: "Oops",
              isOwnerVisible: false
            }
          }
        }),
      })
    );
    expect(res.status).toBe(403);
  });

  test("15. Owner fetches comments (should strip surprise comments)", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/comments`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${ownerToken}`
        }
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.Result.length).toBe(0);
  });

  test("16. Collaborator fetches comments (should see all comments)", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/comments`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${collaboratorToken}`
        }
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.Result.length).toBe(1);
    expect(body.Result[0].Content).toBe("Surprise gift discussion!");
  });

  test("17. Owner fetches items (should strip hidden idea and claims details)", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/items`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${ownerToken}`
        }
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    
    // Should only see the PS5 Pro, not the Secret Book
    expect(body.Result.length).toBe(1);
    expect(body.Result[0].Name).toBe("PlayStation 5 Pro");
    // Claim details must be empty/hidden for the owner
    expect(body.Result[0].Claims.length).toBe(0);
  });

  test("18. Collaborator fetches items (should see secret items and claim details)", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/items`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${collaboratorToken}`
        }
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    
    // Should see both items
    expect(body.Result.length).toBe(2);
    const names = body.Result.map((i: any) => i.Name);
    expect(names).toContain("PlayStation 5 Pro");
    expect(names).toContain("Secret Book");

    const ps5 = body.Result.find((i: any) => i.Name === "PlayStation 5 Pro");
    // Should see the claim transaction
    expect(ps5.Claims.length).toBe(1);
    expect(ps5.Claims[0].Amount).toBe(50);
    expect(ps5.SuggestedByUserId).toBe(ownerUserId);

    const secretBook = body.Result.find((i: any) => i.Name === "Secret Book");
    expect(secretBook.SuggestedByUserId).toBe(collaboratorUserId);
  });

  test("19. Collaborator cannot deactivate wishlist", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/deactivate`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${collaboratorToken}`
        }
      })
    );
    expect(res.status).toBe(403);
  });

  test("20. Owner deactivates wishlist", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/deactivate`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${ownerToken}`
        }
      })
    );
    expect(res.status).toBe(200);
  });

  test("21. Get /api/auth/me (Bearer Token) returns sanitized user profile", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/auth/me", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${ownerToken}`
        }
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.Result.User.Id).toBe(ownerUserId);
    expect(body.Result.User.Email).toBe(ownerEmail);
    expect(body.Result.User.Username).toBe(ownerUsername);
    expect(body.Result.User.AuthHash).toBeUndefined(); // Verify payload hygiene / password hash removal
  });

  test("22. Login returns Set-Cookie and body without AuthHash", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Giftistry: {
            Auth: {
              email: ownerEmail,
              password: testPassword
            }
          }
        })
      })
    );
    expect(res.status).toBe(200);
    
    // Extract Set-Cookie header
    const setCookie = res.headers.get("Set-Cookie");
    expect(setCookie).not.toBeNull();
    expect(setCookie).toContain("jwt=");
    expect(setCookie).toContain("HttpOnly");

    const body = await res.json() as any;
    expect(body.Result.User.Id).toBe(ownerUserId);
    expect(body.Result.User.AuthHash).toBeUndefined(); // Verification of payload sanitization
  });

  test("23. Fetch /api/auth/me using Cookie", async () => {
    // Perform login first to capture cookie
    const loginRes = await app.handle(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Giftistry: {
            Auth: {
              email: ownerEmail,
              password: testPassword
            }
          }
        })
      })
    );
    const cookie = loginRes.headers.get("Set-Cookie") || "";
    const jwtCookie = cookie.split(";")[0] || "";

    // Request profile using Cookie header
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
    expect(body.Result.User.Id).toBe(ownerUserId);
    expect(body.Result.User.AuthHash).toBeUndefined();
  });

  test("24. Logout clears the jwt cookie", async () => {
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

  test("25. Fetch /api/auth/me after logout/without credentials is unauthorized", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/auth/me", {
        method: "GET"
      })
    );
    expect(res.status).toBe(401);
  });

  test("26. Rate limiter blocks request after 5 attempts under x-test-rate-limit forced mode", async () => {
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
    const json6 = await res6.json();
    expect(json6.Result.Timeframe).toBe("60s");
  });

  test("27. Fetch Swagger JSON returns valid OpenAPI specification", async () => {
    const res = await app.handle(
      new Request("http://localhost/docs/json", {
        method: "GET"
      })
    );
    expect(res.status).toBe(200);
    const spec = await res.json();
    expect(spec.openapi).toContain("3.");
    expect(spec.info.title).toBe("Giftistry API Documentation");
    expect(spec.paths["/api/auth/signup"]).toBeDefined();
    expect(spec.paths["/api/auth/login"]).toBeDefined();
  });
});
