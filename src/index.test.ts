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

  test("28. Wishlist Rollover copies unpurchased items and rollover comments", async () => {
    // 1. Create a list that we'll expire
    const createListRes = await app.handle(
      new Request("http://localhost/api/wishlists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${ownerToken}`
        },
        body: JSON.stringify({
          Giftistry: {
            Lists: {
              title: "Holiday List 2026",
              expiresAt: new Date(Date.now() - 1000).toISOString(),
              allowGroupFunds: false
            }
          }
        }),
      })
    );
    expect(createListRes.status).toBe(200);
    const createListBody = await createListRes.json() as any;
    const oldListId = createListBody.Result.Id;

    // Share oldListId with collaborator
    const shareRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${oldListId}/shares`, {
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
    expect(shareRes.status).toBe(200);

    // 2. Add an item that will be claimed (purchased)
    const item1Res = await app.handle(
      new Request(`http://localhost/api/wishlists/${oldListId}/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${ownerToken}`
        },
        body: JSON.stringify({
          Giftistry: {
            Items: { name: "Claimed Item", isHiddenIdea: false }
          }
        }),
      })
    );
    const item1Id = (await item1Res.json() as any).Result.Id;

    // Claim item 1
    const claimRes = await app.handle(
      new Request(`http://localhost/api/items/${item1Id}/claims`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${collaboratorToken}`
        },
        body: JSON.stringify({
          Giftistry: {
            Items: { amount: null, claimedByName: "Santa" }
          }
        }),
      })
    );
    expect(claimRes.status).toBe(200);

    // 3. Add an item that will NOT be claimed (unpurchased)
    const item2Res = await app.handle(
      new Request(`http://localhost/api/wishlists/${oldListId}/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${ownerToken}`
        },
        body: JSON.stringify({
          Giftistry: {
            Items: { name: "Unclaimed Item", description: "Please buy me", isHiddenIdea: false }
          }
        }),
      })
    );
    const item2Id = (await item2Res.json() as any).Result.Id;

    // Add a link to the unclaimed item
    const linkRes = await app.handle(
      new Request(`http://localhost/api/items/${item2Id}/links`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${ownerToken}`
        },
        body: JSON.stringify({
          Giftistry: {
            Items: { url: "https://example.com/unclaimed" }
          }
        }),
      })
    );
    expect(linkRes.status).toBe(200);

    // 4. Add comments: one with rollover=true, one with rollover=false
    const c1Res = await app.handle(
      new Request(`http://localhost/api/wishlists/${oldListId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${collaboratorToken}`
        },
        body: JSON.stringify({
          Giftistry: {
            Comments: { content: "I should carry over", isOwnerVisible: true, isRollover: true }
          }
        }),
      })
    );
    expect(c1Res.status).toBe(200);

    const c2Res = await app.handle(
      new Request(`http://localhost/api/wishlists/${oldListId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${collaboratorToken}`
        },
        body: JSON.stringify({
          Giftistry: {
            Comments: { content: "I should NOT carry over", isOwnerVisible: true, isRollover: false }
          }
        }),
      })
    );
    expect(c2Res.status).toBe(200);

    // 5. Trigger rollover!
    const rolloverRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${oldListId}/rollover`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${ownerToken}`
        }
      })
    );
    expect(rolloverRes.status).toBe(200);
    const rolloverBody = await rolloverRes.json() as any;
    const newListId = rolloverBody.Result.Id;

    // 6. Verify old list is deactivated
    const oldListRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${oldListId}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${ownerToken}`
        }
      })
    );
    const oldListBody = await oldListRes.json() as any;
    expect(oldListBody.Result.IsActive).toBe(false);

    // 7. Verify new list has the correct items
    const newItemsRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${newListId}/items`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${ownerToken}`
        }
      })
    );
    const newItemsBody = await newItemsRes.json() as any;
    expect(newItemsBody.Result.length).toBe(1);
    expect(newItemsBody.Result[0].Name).toBe("Unclaimed Item");
    expect(newItemsBody.Result[0].Description).toBe("Please buy me");
    expect(newItemsBody.Result[0].Links.length).toBe(1);
    expect(newItemsBody.Result[0].Links[0].Url).toBe("https://example.com/unclaimed");

    // 8. Verify new list comments
    const newCommentsRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${newListId}/comments`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${collaboratorToken}`
        }
      })
    );
    const newCommentsBody = await newCommentsRes.json() as any;
    expect(newCommentsBody.Result.length).toBe(1);
    expect(newCommentsBody.Result[0].Content).toBe("I should carry over");
  });

  test("29. Delete Item removes item and associated links/claims", async () => {
    // 1. Create a dummy item
    const createRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${ownerToken}`
        },
        body: JSON.stringify({
          Giftistry: {
            Items: { name: "Temp Item to Delete", description: "Transient" }
          }
        })
      })
    );
    expect(createRes.status).toBe(200);
    const createBody = await createRes.json() as any;
    const tempItemId = createBody.Result.Id;

    // 2. Add a link to it
    const linkRes = await app.handle(
      new Request(`http://localhost/api/items/${tempItemId}/links`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${ownerToken}`
        },
        body: JSON.stringify({
          Giftistry: {
            Items: { url: "https://example.com/delete-me" }
          }
        })
      })
    );
    expect(linkRes.status).toBe(200);

    // 3. Delete the item!
    const deleteRes = await app.handle(
      new Request(`http://localhost/api/items/${tempItemId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${ownerToken}`
        }
      })
    );
    expect(deleteRes.status).toBe(200);

    // 4. Verify it's gone
    const verifyListRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/items`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${ownerToken}`
        }
      })
    );
    const verifyListBody = await verifyListRes.json() as any;
    const found = verifyListBody.Result.some((it: any) => it.Id === tempItemId);
    expect(found).toBe(false);
  });

  test("30. Owner deletes wishlist (cascades list, items, claims, comments)", async () => {
    // 1. Create a dummy wishlist
    const createListRes = await app.handle(
      new Request("http://localhost/api/wishlists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${ownerToken}`
        },
        body: JSON.stringify({
          Giftistry: {
            Lists: {
              title: "Wishlist to Delete",
              expiresAt: null,
              allowGroupFunds: false
            }
          }
        }),
      })
    );
    expect(createListRes.status).toBe(200);
    const deleteListId = (await createListRes.json() as any).Result.Id;

    // 2. Add an item
    const addItemRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${deleteListId}/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${ownerToken}`
        },
        body: JSON.stringify({
          Giftistry: {
            Items: { name: "Item to cascade delete", description: "Transient item" }
          }
        })
      })
    );
    expect(addItemRes.status).toBe(200);

    // 3. Add a comment
    const commentRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${deleteListId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${ownerToken}`
        },
        body: JSON.stringify({
          Giftistry: {
            Comments: { content: "Transient comment", isOwnerVisible: true }
          }
        })
      })
    );
    expect(commentRes.status).toBe(200);

    // 4. Delete the wishlist!
    const deleteRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${deleteListId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${ownerToken}`
        }
      })
    );
    expect(deleteRes.status).toBe(200);

    // 5. Verify the wishlist cannot be retrieved (will fail listAccessMiddleware checking)
    const getRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${deleteListId}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${ownerToken}`
        }
      })
    );
    expect(getRes.status).toBe(404);
  });

  test("31. Fetch dynamic optional field definitions for Clothing", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/items/field-definitions?category=clothing", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${ownerToken}`
        }
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.Meta.Status).toBe("Success");
    expect(Array.isArray(body.Result)).toBe(true);
    
    // Check we have the seeded fields (like pantsSize, shirtSize)
    const keys = body.Result.map((d: any) => d.FieldKey);
    expect(keys).toContain("pantsSize");
    expect(keys).toContain("shirtSize");
    expect(keys).toContain("waistFit");
    
    // Check that waistFit has dependencies
    const waistFit = body.Result.find((d: any) => d.FieldKey === "waistFit");
    expect(waistFit).toBeDefined();
    expect(waistFit.Dependencies).toBeDefined();
    expect(waistFit.Dependencies.length).toBeGreaterThan(0);
    expect(waistFit.Dependencies[0].TriggerFieldKey).toBe("pantsSize");
  });

  test("32. Create, query, and delete priority category", async () => {
    // 1. Create a priority category
    const createRes = await app.handle(
      new Request("http://localhost/api/priorities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${ownerToken}`
        },
        body: JSON.stringify({
          Giftistry: {
            Priorities: {
              label: "Super Crucial Category",
              weight: 8
            }
          }
        })
      })
    );
    expect(createRes.status).toBe(200);
    const createBody = await createRes.json() as any;
    expect(createBody.Meta.Status).toBe("Success");
    const priorityId = createBody.Result.Id;
    expect(priorityId).toBeDefined();

    // 2. Query priorities using GET /priorities
    const listRes = await app.handle(
      new Request("http://localhost/api/priorities", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${ownerToken}`
        }
      })
    );
    expect(listRes.status).toBe(200);
    const listBody = await listRes.json() as any;
    expect(listBody.Meta.Status).toBe("Success");
    expect(listBody.Result.some((p: any) => p.Id === priorityId)).toBe(true);

    // 3. Try to delete with collaborator (forbidden)
    const deleteCollabRes = await app.handle(
      new Request(`http://localhost/api/priorities/${priorityId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${collaboratorToken}`
        }
      })
    );
    expect(deleteCollabRes.status).toBe(403);

    // 4. Delete with owner (success)
    const deleteOwnerRes = await app.handle(
      new Request(`http://localhost/api/priorities/${priorityId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${ownerToken}`
        }
      })
    );
    expect(deleteOwnerRes.status).toBe(200);
    const deleteOwnerBody = await deleteOwnerRes.json() as any;
    expect(deleteOwnerBody.Meta.Status).toBe("Success");

    // 5. Verify it is gone
    const listAfterRes = await app.handle(
      new Request("http://localhost/api/priorities", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${ownerToken}`
        }
      })
    );
    const listAfterBody = await listAfterRes.json() as any;
    expect(listAfterBody.Result.some((p: any) => p.Id === priorityId)).toBe(false);
  });

  test("33. Suggestions and Anonymous Claims Lifecycle", async () => {
    // 1. Create a wishlist with revealSuggestions = true and expires in 1.5 seconds
    const listRes = await app.handle(
      new Request("http://localhost/api/wishlists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${ownerToken}`
        },
        body: JSON.stringify({
          Giftistry: {
            Lists: {
              title: "Suggestion Test Wishlist",
              expiresAt: new Date(Date.now() + 1500).toISOString(),
              allowGroupFunds: false,
              category: "generic",
              revealSuggestions: true
            }
          }
        })
      })
    );
    expect(listRes.status).toBe(200);
    const listBody = await listRes.json() as any;
    const testListId = listBody.Result.Id;

    // Share list with collaborator
    const shareRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${testListId}/shares`, {
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
        })
      })
    );
    expect(shareRes.status).toBe(200);

    // 2. Collaborator suggests an item
    const suggestRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${testListId}/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${collaboratorToken}`
        },
        body: JSON.stringify({
          Giftistry: {
            Items: {
              name: "Collaborator Suggestion Item",
              description: "Hope they like it!",
              priorityId: null,
              category: "generic"
            }
          }
        })
      })
    );
    expect(suggestRes.status).toBe(200);
    const suggestBody = await suggestRes.json() as any;
    const testItemId = suggestBody.Result.Id;
    expect(suggestBody.Result.IsSuggestion).toBe(true);

    // 3. Owner gets list items -> Suggestion must not be present because active
    const ownerGetActiveRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${testListId}/items`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${ownerToken}` }
      })
    );
    expect(ownerGetActiveRes.status).toBe(200);
    const ownerActiveBody = await ownerGetActiveRes.json() as any;
    expect(ownerActiveBody.Result.some((item: any) => item.Id === testItemId)).toBe(false);

    // 4. Collaborator claims the item anonymously
    const claimRes = await app.handle(
      new Request(`http://localhost/api/items/${testItemId}/claims`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${collaboratorToken}`
        },
        body: JSON.stringify({
          Giftistry: {
            Items: {
              claimedByName: "Collab Guy",
              anonymous: true
            }
          }
        })
      })
    );
    expect(claimRes.status).toBe(200);
    const claimBody = await claimRes.json() as any;
    expect(claimBody.Result.Anonymous).toBe(true);

    // 5. Unrelated user gets the items -> should see 'Anonymous' instead of 'Collab Guy'
    // Share list with unrelated user as viewer first
    const shareUnrelatedRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${testListId}/shares`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${ownerToken}`
        },
        body: JSON.stringify({
          Giftistry: {
            Lists: {
              email: unrelatedEmail,
              role: "viewer"
            }
          }
        })
      })
    );
    expect(shareUnrelatedRes.status).toBe(200);

    const unrelatedGetRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${testListId}/items`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${unrelatedToken}` }
      })
    );
    expect(unrelatedGetRes.status).toBe(200);
    const unrelatedBody = await unrelatedGetRes.json() as any;
    const itemForUnrelated = unrelatedBody.Result.find((item: any) => item.Id === testItemId);
    expect(itemForUnrelated).toBeDefined();
    expect(itemForUnrelated.Claims[0].ClaimedByName).toBe("Anonymous");

    // 6. Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 7. Owner gets list items -> Suggestion must be visible now since expired, and revealSuggestions is true
    const ownerGetExpiredRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${testListId}/items`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${ownerToken}` }
      })
    );
    expect(ownerGetExpiredRes.status).toBe(200);
    const ownerExpiredBody = await ownerGetExpiredRes.json() as any;
    const itemForOwner = ownerExpiredBody.Result.find((item: any) => item.Id === testItemId);
    expect(itemForOwner).toBeDefined();
    expect(itemForOwner.SuggestedByUsername).toBe(collaboratorUsername);

    // Clean up temporary wishlist lists (DB cascade deletes items, claims and shares)
    await sql`DELETE FROM lists WHERE id = ${testListId}`;
  });

  test("34. Claim and Unclaim Lifecycle", async () => {
    // 1. Create a wishlist
    const createListRes = await app.handle(
      new Request("http://localhost/api/wishlists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${ownerToken}`
        },
        body: JSON.stringify({
          Giftistry: {
            Lists: {
              title: "Unclaim Test List",
              expiresAt: new Date(Date.now() + 86400000).toISOString(),
              allowGroupFunds: false,
              category: "Tech"
            }
          }
        })
      })
    );
    expect(createListRes.status).toBe(200);
    const { Result: { Id: testListId } } = await createListRes.json() as any;

    // 2. Add an item as owner
    const addItemRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${testListId}/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${ownerToken}`
        },
        body: JSON.stringify({
          Giftistry: {
            Items: {
              name: "Unclaimable Item",
              category: "Tech"
            }
          }
        })
      })
    );
    expect(addItemRes.status).toBe(200);
    const { Result: { Id: testItemId } } = await addItemRes.json() as any;

    // 3. Share list with viewer
    const shareRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${testListId}/shares`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${ownerToken}`
        },
        body: JSON.stringify({
          Giftistry: {
            Lists: {
              email: collaboratorEmail,
              role: "viewer"
            }
          }
        })
      })
    );
    expect(shareRes.status).toBe(200);

    // 4. Viewer claims the item
    const claimRes = await app.handle(
      new Request(`http://localhost/api/items/${testItemId}/claims`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${collaboratorToken}`
        },
        body: JSON.stringify({
          Giftistry: {
            Items: {
              claimedByName: "Claimer Friend"
            }
          }
        })
      })
    );
    expect(claimRes.status).toBe(200);

    // Verify it is claimed
    const getItemsRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${testListId}/items`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${collaboratorToken}` }
      })
    );
    expect(getItemsRes.status).toBe(200);
    const items = await getItemsRes.json() as any;
    const claimedItem = items.Result.find((i: any) => i.Id === testItemId);
    expect(claimedItem.IsClaimed).toBe(true);
    expect(claimedItem.Claims.length).toBe(1);

    // 5. Owner tries to unclaim (should fail)
    const ownerUnclaimRes = await app.handle(
      new Request(`http://localhost/api/items/${testItemId}/claims`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${ownerToken}` }
      })
    );
    expect(ownerUnclaimRes.status).toBe(403);

    // 6. Viewer unclaims the item
    const viewerUnclaimRes = await app.handle(
      new Request(`http://localhost/api/items/${testItemId}/claims`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${collaboratorToken}` }
      })
    );
    expect(viewerUnclaimRes.status).toBe(200);

    // Verify it is unclaimed
    const getItemsRes2 = await app.handle(
      new Request(`http://localhost/api/wishlists/${testListId}/items`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${collaboratorToken}` }
      })
    );
    expect(getItemsRes2.status).toBe(200);
    const items2 = await getItemsRes2.json() as any;
    const unclaimedItem = items2.Result.find((i: any) => i.Id === testItemId);
    expect(unclaimedItem.IsClaimed).toBe(false);
    expect(unclaimedItem.Claims.length).toBe(0);

    // Cleanup
    await sql`DELETE FROM lists WHERE id = ${testListId}`;
  });
});
