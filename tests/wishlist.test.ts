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
    const res = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/shares`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${owner.token}`
        },
        body: JSON.stringify({
          Giftistry: {
            Lists: {
              Email: collaborator.email,
              Role: "collaborator"
            }
          }
        }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.Result.Role).toBe("collaborator");
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
    await shareTestWishlist(owner.token, listId, collaborator.email, "collaborator");
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
    const oldListId = await createTestWishlist(owner.token, "Holiday List 2026", new Date(Date.now() - 1000).toISOString());
    await shareTestWishlist(owner.token, oldListId, collaborator.email, "collaborator");

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
    const itemId = (await itemRes.json() as any).Result.Id;

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
    expect(newItemsBody.Result[0].Name).toBe("Unclaimed Rollover Item");

    await cleanUpWishlist(oldListId);
    await cleanUpWishlist(newListId);
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
      const res = await app.handle(
        new Request(`http://localhost/api/wishlists/${listId}/pdf`, {
          method: "GET",
          headers: { "Authorization": `Bearer ${owner.token}` }
        })
      );
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("application/pdf");
      expect(res.headers.get("Content-Disposition")).toContain("attachment; filename=");
      const arrayBuffer = await res.arrayBuffer();
      expect(arrayBuffer.byteLength).toBeGreaterThan(0);
    });
  });
});
