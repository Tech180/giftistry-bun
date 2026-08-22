import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import { app } from '../src/index';
import { sql } from '../src/common/database/connection';
import { createTestUser, createTestWishlist, shareTestWishlist, cleanUpUser, cleanUpWishlist } from './helper';

describe("Wishlist Lifecycle & Shares", () => {
  let owner: any;
  let collaborator: any;
  let unrelated: any;
  let listId: string;

  beforeAll(async () => {
    const timestamp = Date.now();
    owner = await createTestUser(`wl_owner_${timestamp}`, `wl_owner_${timestamp}@example.com`);
    collaborator = await createTestUser(`wl_collab_${timestamp}`, `wl_collab_${timestamp}@example.com`);
    unrelated = await createTestUser(`wl_unrelated_${timestamp}`, `wl_unrelated_${timestamp}@example.com`);
  });

  afterAll(async () => {
    await cleanUpUser(owner.userId);
    await cleanUpUser(collaborator.userId);
    await cleanUpUser(unrelated.userId);
  });

  test("Owner creates a Wishlist", async () => {
    listId = await createTestWishlist(owner.token, "Birthday List");
    expect(listId).toBeDefined();
  });

  test("Unrelated user access is forbidden", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/items`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${unrelated.token}`
        }
      })
    );
    expect(res.status).toBe(403);
  });

  test("Owner shares wishlist with Collaborator", async () => {
    await shareTestWishlist(owner, listId, collaborator, "collaborator");

    const res = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/shares`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${owner.token}` }
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.Result.length).toBeGreaterThanOrEqual(1);
    expect(body.Result[0].Email).toBe(collaborator.email);
    expect(body.Result[0].Role).toBe("collaborator");
  });

  test("Owner lists wishlist shares", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/shares`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${owner.token}` }
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.Result.length).toBeGreaterThanOrEqual(1);
    expect(body.Result[0].Email).toBe(collaborator.email);
  });

  test("Owner updates share role to viewer", async () => {
    const listRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/shares`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${owner.token}` }
      })
    );
    const listBody = await listRes.json() as any;
    const shareId = listBody.Result[0].Id;

    const res = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/shares/${shareId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${owner.token}`
        },
        body: JSON.stringify({
          Giftistry: {
            Lists: {
              Role: "viewer"
            }
          }
        })
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.Result.Role).toBe("viewer");
  });

  test("Owner removes share", async () => {
    const listRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/shares`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${owner.token}` }
      })
    );
    const listBody = await listRes.json() as any;
    const shareId = listBody.Result[0].Id;

    const res = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/shares/${shareId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${owner.token}` }
      })
    );
    expect(res.status).toBe(200);

    const verifyRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/shares`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${owner.token}` }
      })
    );
    const verifyBody = await verifyRes.json() as any;
    expect(verifyBody.Result.length).toBe(0);
  });

  test("Re-share for collaborator access tests", async () => {
    await shareTestWishlist(owner, listId, collaborator, "collaborator");
  });

  test("Collaborator cannot deactivate wishlist", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/deactivate`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${collaborator.token}`
        }
      })
    );
    expect(res.status).toBe(403);
  });

  test("Owner deactivates wishlist", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/deactivate`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${owner.token}`
        }
      })
    );
    expect(res.status).toBe(200);
  });

  test("Owner deletes wishlist", async () => {
    const deleteListId = await createTestWishlist(owner.token, "Delete Me");
    const deleteRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${deleteListId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${owner.token}`
        }
      })
    );
    expect(deleteRes.status).toBe(200);

    const getRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${deleteListId}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${owner.token}`
        }
      })
    );
    expect(getRes.status).toBe(404);
  });

  test("Wishlist Rollover copies unpurchased items", async () => {
    const oldListId = await createTestWishlist(
      owner.token,
      "Holiday List 2026",
      new Date(Date.now() + 86400000).toISOString()
    );
    await shareTestWishlist(owner, oldListId, collaborator, "collaborator");

    // Add item that will NOT be claimed (unpurchased)
    const itemRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${oldListId}/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${owner.token}`
        },
        body: JSON.stringify({
          Giftistry: {
            Items: { Name: "Unclaimed Rollover Item", Description: "Roll me", IsHiddenIdea: false }
          }
        }),
      })
    );
    expect(itemRes.status).toBe(200);

    const expireRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${oldListId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${owner.token}`
        },
        body: JSON.stringify({
          Giftistry: {
            Lists: {
              Title: "Holiday List 2026",
              ExpiresAt: new Date(Date.now() - 1000).toISOString(),
              AllowGroupFunds: true,
            }
          }
        }),
      })
    );
    expect(expireRes.status).toBe(200);

    // Trigger rollover
    const rolloverRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${oldListId}/rollover`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${owner.token}`
        }
      })
    );
    expect(rolloverRes.status).toBe(200);
    const rolloverBody = await rolloverRes.json() as any;
    const newListId = rolloverBody.Result.Id;

    // Verify new list has the rollover item
    const newItemsRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${newListId}/items`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${owner.token}`
        }
      })
    );
    const newItemsBody = await newItemsRes.json() as any;
    expect(newItemsBody.Result.Items.length).toBe(1);
    expect(newItemsBody.Result.Items[0].Name).toBe("Unclaimed Rollover Item");

    await cleanUpWishlist(oldListId);
    await cleanUpWishlist(newListId);
  });

  test("GET expired wishlist without AutoRollover deactivates it", async () => {
    const listId = await createTestWishlist(
      owner.token,
      "Lazy Archive List",
      new Date(Date.now() + 86400000).toISOString(),
      "generic",
      true,
      false
    );

    const expireRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${owner.token}`
        },
        body: JSON.stringify({
          Giftistry: {
            Lists: {
              Title: "Lazy Archive List",
              ExpiresAt: new Date(Date.now() - 1000).toISOString(),
              AllowGroupFunds: true,
              AutoRollover: false,
            }
          }
        }),
      })
    );
    expect(expireRes.status).toBe(200);

    const getRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${owner.token}` }
      })
    );
    expect(getRes.status).toBe(200);
    const body = await getRes.json() as any;
    expect(body.Result.Id).toBe(listId);
    expect(body.Result.IsActive).toBe(false);

    await cleanUpWishlist(listId);
  });

  test("extending expiry on archived list keeps IsActive false", async () => {
    const listId = await createTestWishlist(
      owner.token,
      "Extend While Archived",
      new Date(Date.now() + 86400000).toISOString(),
      "generic",
      true,
      false
    );

    const expireRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${owner.token}`
        },
        body: JSON.stringify({
          Giftistry: {
            Lists: {
              Title: "Extend While Archived",
              ExpiresAt: new Date(Date.now() - 1000).toISOString(),
              AllowGroupFunds: true,
              AutoRollover: false,
            }
          }
        }),
      })
    );
    expect(expireRes.status).toBe(200);

    const getExpired = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${owner.token}` }
      })
    );
    expect((await getExpired.json() as any).Result.IsActive).toBe(false);

    const futureIso = new Date(Date.now() + 7 * 86400000).toISOString();
    const extendRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${owner.token}`
        },
        body: JSON.stringify({
          Giftistry: {
            Lists: {
              Title: "Extend While Archived",
              ExpiresAt: futureIso,
              AllowGroupFunds: true,
              AutoRollover: false,
            }
          }
        }),
      })
    );
    expect(extendRes.status).toBe(200);
    const extendBody = await extendRes.json() as any;
    expect(extendBody.Result.IsActive).toBe(false);
    expect(new Date(extendBody.Result.ExpiresAt).getTime()).toBeGreaterThan(Date.now());

    const getAgain = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${owner.token}` }
      })
    );
    const againBody = await getAgain.json() as any;
    expect(againBody.Result.IsActive).toBe(false);
    expect(new Date(againBody.Result.ExpiresAt).getTime()).toBeGreaterThan(Date.now());

    await cleanUpWishlist(listId);
  });

  test("activate with past ExpiresAt clears expiration", async () => {
    const listId = await createTestWishlist(
      owner.token,
      "Restore Clears Expiry",
      new Date(Date.now() + 86400000).toISOString(),
      "generic",
      true,
      false
    );

    await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${owner.token}`
        },
        body: JSON.stringify({
          Giftistry: {
            Lists: {
              Title: "Restore Clears Expiry",
              ExpiresAt: new Date(Date.now() - 1000).toISOString(),
              AllowGroupFunds: true,
              AutoRollover: false,
            }
          }
        }),
      })
    );

    await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${owner.token}` }
      })
    );

    const activateRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/activate`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${owner.token}` }
      })
    );
    expect(activateRes.status).toBe(200);
    const activateBody = await activateRes.json() as any;
    expect(activateBody.Result.IsActive).toBe(true);
    expect(activateBody.Result.ExpiresAt).toBeNull();

    const getRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${owner.token}` }
      })
    );
    const getBody = await getRes.json() as any;
    expect(getBody.Result.IsActive).toBe(true);
    expect(getBody.Result.ExpiresAt).toBeNull();

    await cleanUpWishlist(listId);
  });

  test("activate with future ExpiresAt keeps expiration", async () => {
    const listId = await createTestWishlist(
      owner.token,
      "Restore Keeps Future Expiry",
      new Date(Date.now() + 86400000).toISOString(),
      "generic",
      true,
      false
    );

    await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/deactivate`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${owner.token}` }
      })
    );

    const futureIso = new Date(Date.now() + 5 * 86400000).toISOString();
    await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${owner.token}`
        },
        body: JSON.stringify({
          Giftistry: {
            Lists: {
              Title: "Restore Keeps Future Expiry",
              ExpiresAt: futureIso,
              AllowGroupFunds: true,
              AutoRollover: false,
            }
          }
        }),
      })
    );

    const activateRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/activate`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${owner.token}` }
      })
    );
    expect(activateRes.status).toBe(200);
    const activateBody = await activateRes.json() as any;
    expect(activateBody.Result.IsActive).toBe(true);
    expect(activateBody.Result.ExpiresAt).not.toBeNull();
    expect(new Date(activateBody.Result.ExpiresAt).getTime()).toBeGreaterThan(Date.now());

    await cleanUpWishlist(listId);
  });

  test("GET expired wishlist with AutoRollover returns new list", async () => {
    const oldListId = await createTestWishlist(
      owner.token,
      "Auto Rollover List",
      new Date(Date.now() + 86400000).toISOString(),
      "generic",
      true,
      true
    );

    const itemRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${oldListId}/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${owner.token}`
        },
        body: JSON.stringify({
          Giftistry: {
            Items: { Name: "Carry Me", IsHiddenIdea: false }
          }
        }),
      })
    );
    expect(itemRes.status).toBe(200);

    const commentRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${oldListId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${owner.token}`
        },
        body: JSON.stringify({
          Giftistry: {
            Comments: {
              Content: "Keep this thread",
              CommenterName: "Owner",
              IsOwnerVisible: true,
              IsRollover: true,
            }
          }
        }),
      })
    );
    expect(commentRes.status).toBe(200);

    const expireRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${oldListId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${owner.token}`
        },
        body: JSON.stringify({
          Giftistry: {
            Lists: {
              Title: "Auto Rollover List",
              ExpiresAt: new Date(Date.now() - 1000).toISOString(),
              AllowGroupFunds: true,
              AutoRollover: true,
            }
          }
        }),
      })
    );
    expect(expireRes.status).toBe(200);

    const getRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${oldListId}`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${owner.token}` }
      })
    );
    expect(getRes.status).toBe(200);
    const body = await getRes.json() as any;
    const newListId = body.Result.Id;
    expect(newListId).not.toBe(oldListId);
    expect(body.Result.IsActive).toBe(true);
    expect(body.Result.AutoRollover).toBe(true);

    const newItemsRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${newListId}/items`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${owner.token}` }
      })
    );
    const newItemsBody = await newItemsRes.json() as any;
    expect(newItemsBody.Result.Items.length).toBe(1);
    expect(newItemsBody.Result.Items[0].Name).toBe("Carry Me");

    const commentsRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${newListId}/comments`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${owner.token}` }
      })
    );
    const commentsBody = await commentsRes.json() as any;
    const comments = commentsBody.Result?.Comments ?? commentsBody.Result ?? [];
    expect(comments.some((c: any) => c.Content === "Keep this thread" && c.IsRollover === true)).toBe(true);

    await cleanUpWishlist(oldListId);
    await cleanUpWishlist(newListId);
  });

  test("inactive wishlist is counted in archive bucket", async () => {
    const listId = await createTestWishlist(owner.token, "Manual Archive Bucket List");
    const deactivateRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/deactivate`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${owner.token}` }
      })
    );
    expect(deactivateRes.status).toBe(200);

    const listRes = await app.handle(
      new Request("http://localhost/api/wishlists?bucket=archive", {
        method: "GET",
        headers: { "Authorization": `Bearer ${owner.token}` }
      })
    );
    expect(listRes.status).toBe(200);
    const listBody = await listRes.json() as any;
    const wishlists = listBody.Result.Wishlists ?? listBody.Result;
    expect(wishlists.some((w: any) => w.Id === listId)).toBe(true);

    await cleanUpWishlist(listId);
  });

  test("expired wishlist rejects item mutations", async () => {
    const listId = await createTestWishlist(
      owner.token,
      "Mutation Lock List",
      new Date(Date.now() + 86400000).toISOString()
    );

    const itemRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${owner.token}`
        },
        body: JSON.stringify({
          Giftistry: { Items: { Name: "Soon Locked" } }
        }),
      })
    );
    expect(itemRes.status).toBe(200);
    const itemId = (await itemRes.json() as any).Result.Id;

    const expireRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${owner.token}`
        },
        body: JSON.stringify({
          Giftistry: {
            Lists: {
              Title: "Mutation Lock List",
              ExpiresAt: new Date(Date.now() - 1000).toISOString(),
              AllowGroupFunds: true,
            }
          }
        }),
      })
    );
    expect(expireRes.status).toBe(200);

    const addRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${owner.token}`
        },
        body: JSON.stringify({
          Giftistry: { Items: { Name: "Should Fail" } }
        }),
      })
    );
    expect(addRes.status).toBe(400);

    const updateRes = await app.handle(
      new Request(`http://localhost/api/items/${itemId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${owner.token}`
        },
        body: JSON.stringify({
          Giftistry: { Items: { Name: "Renamed" } }
        }),
      })
    );
    expect(updateRes.status).toBe(400);

    const deleteRes = await app.handle(
      new Request(`http://localhost/api/items/${itemId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${owner.token}` }
      })
    );
    expect(deleteRes.status).toBe(400);

    await cleanUpWishlist(listId);
  });

  test("Create, query, and delete priority category", async () => {
    const createRes = await app.handle(
      new Request("http://localhost/api/priorities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${owner.token}`
        },
        body: JSON.stringify({
          Giftistry: {
            Priorities: {
              Label: "Wishlist High Priority",
              Weight: 9
            }
          }
        })
      })
    );
    expect(createRes.status).toBe(200);
    const createBody = await createRes.json() as any;
    const priorityId = createBody.Result.Id;

    const listRes = await app.handle(
      new Request("http://localhost/api/priorities", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${owner.token}`
        }
      })
    );
    expect(listRes.status).toBe(200);

    const deleteRes = await app.handle(
      new Request(`http://localhost/api/priorities/${priorityId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${owner.token}`
        }
      })
    );
    expect(deleteRes.status).toBe(200);
  });

  describe("Password-Protected Link Invites", () => {
    let unpasswordedToken: string;
    let passwordedToken: string;
    let passwordedInviteId: string;

    test("Owner generates unpassworded link invite", async () => {
      const res = await app.handle(
        new Request(`http://localhost/api/wishlists/${listId}/link-invites`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${owner.token}`
          },
          body: JSON.stringify({
            Giftistry: {
              Invites: {
                Role: "viewer"
              }
            }
          })
        })
      );
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.Result.Token).toBeDefined();
      unpasswordedToken = body.Result.Token;
    });

    test("Unrelated user gets unpassworded invite details", async () => {
      const res = await app.handle(
        new Request(`http://localhost/api/invites/link/${unpasswordedToken}`, {
          method: "GET",
          headers: { "Authorization": `Bearer ${unrelated.token}` }
        })
      );
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.Result.PasswordProtected).toBe(false);
      expect(body.Result.Role).toBe("viewer");
    });

    test("Unrelated user accepts unpassworded invite", async () => {
      const res = await app.handle(
        new Request(`http://localhost/api/invites/link/${unpasswordedToken}/accept`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${unrelated.token}`
          },
          body: JSON.stringify({})
        })
      );
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.Result.ListId).toBe(listId);
      expect(body.Result.Role).toBe("viewer");
    });

    test("Owner generates password-protected link invite", async () => {
      const res = await app.handle(
        new Request(`http://localhost/api/wishlists/${listId}/link-invites`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${owner.token}`
          },
          body: JSON.stringify({
            Giftistry: {
              Invites: {
                Role: "collaborator",
                Password: "superSecurePassword123"
              }
            }
          })
        })
      );
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.Result.Token).toBeDefined();
      expect(body.Result.Invite.PasswordProtected).toBe(true);
      passwordedToken = body.Result.Token;
      passwordedInviteId = body.Result.Invite.Id;
    });

    test("Unrelated user gets passworded invite details", async () => {
      const anotherUnrelated = await createTestUser(`wl_another_${Date.now()}`, `wl_another_${Date.now()}@example.com`);
      
      const res = await app.handle(
        new Request(`http://localhost/api/invites/link/${passwordedToken}`, {
          method: "GET",
          headers: { "Authorization": `Bearer ${anotherUnrelated.token}` }
        })
      );
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.Result.PasswordProtected).toBe(true);
      expect(body.Result.Role).toBe("collaborator");

      await cleanUpUser(anotherUnrelated.userId);
    });

    test("Unrelated user fails to accept passworded invite with wrong password", async () => {
      const anotherUnrelated = await createTestUser(`wl_another_${Date.now()}`, `wl_another_${Date.now()}@example.com`);

      const res = await app.handle(
        new Request(`http://localhost/api/invites/link/${passwordedToken}/accept`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${anotherUnrelated.token}`
          },
          body: JSON.stringify({
            Giftistry: {
              Invites: {
                Password: "wrongPassword"
              }
            }
          })
        })
      );
      expect(res.status).toBe(401);

      await cleanUpUser(anotherUnrelated.userId);
    });

    test("Unrelated user accepts passworded invite with correct password", async () => {
      const anotherUnrelated = await createTestUser(`wl_another_${Date.now()}`, `wl_another_${Date.now()}@example.com`);

      const res = await app.handle(
        new Request(`http://localhost/api/invites/link/${passwordedToken}/accept`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${anotherUnrelated.token}`
          },
          body: JSON.stringify({
            Giftistry: {
              Invites: {
                Password: "superSecurePassword123"
              }
            }
          })
        })
      );
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.Result.ListId).toBe(listId);
      expect(body.Result.Role).toBe("collaborator");

      await cleanUpUser(anotherUnrelated.userId);
    });

    test("Owner lists link invites", async () => {
      const res = await app.handle(
        new Request(`http://localhost/api/wishlists/${listId}/link-invites`, {
          method: "GET",
          headers: { "Authorization": `Bearer ${owner.token}` }
        })
      );
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.Result.length).toBeGreaterThanOrEqual(1);
      expect(body.Result.some((invite: { Token?: string }) => invite.Token === unpasswordedToken)).toBe(true);
    });

    test("Owner revokes passworded invite", async () => {
      const res = await app.handle(
        new Request(`http://localhost/api/wishlists/${listId}/link-invites/${passwordedInviteId}`, {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${owner.token}` }
        })
      );
      expect(res.status).toBe(200);

      // Verify acceptance now fails
      const anotherUnrelated = await createTestUser(`wl_another_${Date.now()}`, `wl_another_${Date.now()}@example.com`);
      const acceptRes = await app.handle(
        new Request(`http://localhost/api/invites/link/${passwordedToken}/accept`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${anotherUnrelated.token}`
          },
          body: JSON.stringify({
            Giftistry: {
              Invites: {
                Password: "superSecurePassword123"
              }
            }
          })
        })
      );
      expect(acceptRes.status).toBe(404);

      await cleanUpUser(anotherUnrelated.userId);
    });

    test("User exports wishlist as PDF successfully", async () => {
      const pdfListId = await createTestWishlist(owner.token, "PDF Relation Badges List");

      const createItem = async (name: string) => {
        const res = await app.handle(
          new Request(`http://localhost/api/wishlists/${pdfListId}/items`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${owner.token}`
            },
            body: JSON.stringify({
              Giftistry: { Items: { Name: name } }
            }),
          })
        );
        expect(res.status).toBe(200);
        return (await res.json() as { Result: { Id: string } }).Result.Id;
      };

      const linkedA = await createItem("PDF Linked Shirt");
      const linkedB = await createItem("PDF Linked Socks");
      const relatedA = await createItem("PDF Related Tie");
      const relatedB = await createItem("PDF Related Hat");

      const linkSyncRes = await app.handle(
        new Request(`http://localhost/api/items/${linkedA}/links/sync`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${owner.token}`
          },
          body: JSON.stringify({
            Giftistry: { Items: { TargetItemIds: [linkedB] } }
          }),
        })
      );
      expect(linkSyncRes.status).toBe(200);

      const relatedSyncRes = await app.handle(
        new Request(`http://localhost/api/items/${relatedA}/related/sync`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${owner.token}`
          },
          body: JSON.stringify({
            Giftistry: { Items: { TargetItemIds: [relatedB] } }
          }),
        })
      );
      expect(relatedSyncRes.status).toBe(200);

      const res = await app.handle(
        new Request(`http://localhost/api/wishlists/${pdfListId}/pdf`, {
          method: "GET",
          headers: { "Authorization": `Bearer ${owner.token}` }
        })
      );
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("application/pdf");
      expect(res.headers.get("Content-Disposition")).toContain("attachment; filename=");
      const arrayBuffer = await res.arrayBuffer();
      expect(arrayBuffer.byteLength).toBeGreaterThan(0);

      await cleanUpWishlist(pdfListId);
    });
  });
});
