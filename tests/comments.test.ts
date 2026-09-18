import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import { app } from '../src/index';
import { createTestUser, createTestWishlist, shareTestWishlist, cleanUpUser, cleanUpWishlist } from './helper';

describe("Comments surprise filtering & rollover", () => {
  let owner: any;
  let collaborator: any;
  let collaboratorB: any;
  let viewer: any;
  let listId: string;

  beforeAll(async () => {
    const timestamp = Date.now();
    owner = await createTestUser(`comm_owner_${timestamp}`, `comm_owner_${timestamp}@example.com`);
    collaborator = await createTestUser(`comm_collab_${timestamp}`, `comm_collab_${timestamp}@example.com`);
    collaboratorB = await createTestUser(`comm_collab_b_${timestamp}`, `comm_collab_b_${timestamp}@example.com`);
    viewer = await createTestUser(`comm_viewer_${timestamp}`, `comm_viewer_${timestamp}@example.com`);

    listId = await createTestWishlist(owner.token, "Comment Testing Wishlist");
    await shareTestWishlist(owner, listId, collaborator, "collaborator");
    await shareTestWishlist(owner, listId, collaboratorB, "collaborator");
    await shareTestWishlist(owner, listId, viewer, "viewer");
  });

  afterAll(async () => {
    await cleanUpWishlist(listId);
    await cleanUpUser(owner.userId);
    await cleanUpUser(collaborator.userId);
    await cleanUpUser(collaboratorB.userId);
    await cleanUpUser(viewer.userId);
  });

  test("Collaborator leaves surprise comment (non-owner visible)", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${collaborator.token}`
        },
        body: JSON.stringify({
          Giftistry: {
            Comments: {
              Content: "Surprise gift discussion!",
              IsOwnerVisible: false
            }
          }
        }),
      })
    );
    expect(res.status).toBe(200);
  });

  test("Owner cannot post non-owner visible comments", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${owner.token}`
        },
        body: JSON.stringify({
          Giftistry: {
            Comments: {
              Content: "Oops",
              IsOwnerVisible: false
            }
          }
        }),
      })
    );
    expect(res.status).toBe(403);
  });

  test("Owner fetches comments (should strip surprise comments)", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/comments`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${owner.token}`
        }
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.Result.length).toBe(0);
  });

  test("Collaborator fetches comments (should see all comments)", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/comments`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${collaborator.token}`
        }
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.Result.length).toBe(1);
    expect(body.Result[0].Content).toBe("Surprise gift discussion!");
  });

  test("IsRollover is clamped off when list AutoRollover is false", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${collaborator.token}`
        },
        body: JSON.stringify({
          Giftistry: {
            Comments: {
              Content: "Should not rollover",
              CommenterName: "Collab",
              IsOwnerVisible: true,
              IsRollover: true,
            }
          }
        }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.Result.IsRollover).toBe(false);
  });

  test("Collaborator posts visibleToSelected excluding another collaborator", async () => {
    const createRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${collaborator.token}`
        },
        body: JSON.stringify({
          Giftistry: {
            Comments: {
              Content: "Private planning note",
              IsOwnerVisible: true,
              VisibleToUserIds: [owner.userId, collaborator.userId],
            }
          }
        }),
      })
    );
    expect(createRes.status).toBe(200);
    const created = await createRes.json() as any;
    expect(created.Result.VisibleToUserIds).toContain(owner.userId);
    expect(created.Result.VisibleToUserIds).toContain(collaborator.userId);

    const excludedRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/comments`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${collaboratorB.token}`
        }
      })
    );
    expect(excludedRes.status).toBe(200);
    const excludedBody = await excludedRes.json() as any;
    expect(
      excludedBody.Result.some((c: any) => c.Content === "Private planning note")
    ).toBe(false);

    const includedRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/comments`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${owner.token}`
        }
      })
    );
    expect(includedRes.status).toBe(200);
    const includedBody = await includedRes.json() as any;
    expect(
      includedBody.Result.some((c: any) => c.Content === "Private planning note")
    ).toBe(true);
  });

  test("Mention of user not in selected audience returns 400", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${collaborator.token}`
        },
        body: JSON.stringify({
          Giftistry: {
            Comments: {
              Content: `Ping [Viewer](user:${viewer.userId})`,
              IsOwnerVisible: true,
              VisibleToUserIds: [owner.userId],
            }
          }
        }),
      })
    );
    expect(res.status).toBe(400);
  });

  test("Viewer can post visibleToSelected including owner", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${viewer.token}`
        },
        body: JSON.stringify({
          Giftistry: {
            Comments: {
              Content: "Viewer selected audience",
              IsOwnerVisible: true,
              VisibleToUserIds: [owner.userId, viewer.userId],
            }
          }
        }),
      })
    );
    expect(res.status).toBe(200);
  });
});
