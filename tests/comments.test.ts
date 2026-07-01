import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import { app } from '../src/index';
import { createTestUser, createTestWishlist, shareTestWishlist, cleanUpUser, cleanUpWishlist } from './helper';

describe("Comments surprise filtering & rollover", () => {
  let owner: any;
  let collaborator: any;
  let listId: string;

  beforeAll(async () => {
    const timestamp = Date.now();
    owner = await createTestUser(`comm_owner_${timestamp}`, `comm_owner_${timestamp}@example.com`);
    collaborator = await createTestUser(`comm_collab_${timestamp}`, `comm_collab_${timestamp}@example.com`);
    
    listId = await createTestWishlist(owner.token, "Comment Testing Wishlist");
    await shareTestWishlist(owner.token, listId, collaborator.email, "collaborator");
  });

  afterAll(async () => {
    await cleanUpWishlist(listId);
    await cleanUpUser(owner.userId);
    await cleanUpUser(collaborator.userId);
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
              content: "Surprise gift discussion!",
              isOwnerVisible: false
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
              content: "Oops",
              isOwnerVisible: false
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
});
