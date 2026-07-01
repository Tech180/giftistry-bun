import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import { app } from '../src/index';
import { createTestUser, createTestWishlist, shareTestWishlist, cleanUpUser, cleanUpWishlist } from './helper';

describe("Items, Links & Claims", () => {
  let owner: any;
  let collaborator: any;
  let unrelated: any;
  let listId: string;
  let itemId: string;
  let secretItemId: string;

  beforeAll(async () => {
    const timestamp = Date.now();
    owner = await createTestUser(`item_owner_${timestamp}`, `item_owner_${timestamp}@example.com`);
    collaborator = await createTestUser(`item_collab_${timestamp}`, `item_collab_${timestamp}@example.com`);
    unrelated = await createTestUser(`item_unrel_${timestamp}`, `item_unrel_${timestamp}@example.com`);
    
    listId = await createTestWishlist(owner.token, "Item Testing Wishlist");
    await shareTestWishlist(owner.token, listId, collaborator.email, "collaborator");
    await shareTestWishlist(owner.token, listId, unrelated.email, "viewer");
  });

  afterAll(async () => {
    await cleanUpWishlist(listId);
    await cleanUpUser(owner.userId);
    await cleanUpUser(collaborator.userId);
    await cleanUpUser(unrelated.userId);
  });

  test("Owner adds standard item to list", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${owner.token}`
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
    itemId = body.Result.Id;
  });

  test("Owner cannot add hidden ideas to their own list", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${owner.token}`
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

  test("Collaborator adds a hidden idea (surprise) to the list", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${collaborator.token}`
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
    secretItemId = body.Result.Id;
  });

  test("Collaborator adds link to standard item", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/items/${itemId}/links`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${collaborator.token}`
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

  test("Collaborator claims standard item", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/items/${itemId}/claims`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${collaborator.token}`
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

  test("Owner cannot claim items on their own list", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/items/${itemId}/claims`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${owner.token}`
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

  test("Owner fetches items (should strip hidden idea and claims details)", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/items`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${owner.token}`
        }
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.Result.length).toBe(1);
    expect(body.Result[0].Name).toBe("PlayStation 5 Pro");
    expect(body.Result[0].Claims.length).toBe(0);
  });

  test("Collaborator fetches items (should see secret items and claim details)", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/items`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${collaborator.token}`
        }
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.Result.length).toBe(2);
    const names = body.Result.map((i: any) => i.Name);
    expect(names).toContain("PlayStation 5 Pro");
    expect(names).toContain("Secret Book");
  });

  test("Delete Item removes item and associated links/claims", async () => {
    const createRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${owner.token}`
        },
        body: JSON.stringify({
          Giftistry: {
            Items: { name: "Temp Item to Delete", description: "Transient" }
          }
        })
      })
    );
    expect(createRes.status).toBe(200);
    const tempItemId = (await createRes.json() as any).Result.Id;

    const deleteRes = await app.handle(
      new Request(`http://localhost/api/items/${tempItemId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${owner.token}`
        }
      })
    );
    expect(deleteRes.status).toBe(200);
  });

  test("Fetch dynamic optional field definitions for Clothing", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/items/field-definitions?category=clothing", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${owner.token}`
        }
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.Meta.Status).toBe("Success");
    const keys = body.Result.map((d: any) => d.FieldKey);
    expect(keys).toContain("pantsSize");
  });

  test("Suggestions and Anonymous Claims Lifecycle", async () => {
    const testListId = await createTestWishlist(owner.token, "Suggestion Test Wishlist", new Date(Date.now() + 1500).toISOString(), "generic", true);
    await shareTestWishlist(owner.token, testListId, collaborator.email, "collaborator");
    await shareTestWishlist(owner.token, testListId, unrelated.email, "viewer");

    const suggestRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${testListId}/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${collaborator.token}`
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
    const testItemId = (await suggestRes.json() as any).Result.Id;

    // Claim anonymously
    const claimRes = await app.handle(
      new Request(`http://localhost/api/items/${testItemId}/claims`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${collaborator.token}`
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

    // Unrelated user views it
    const unrelatedGetRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${testListId}/items`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${unrelated.token}` }
      })
    );
    const unrelatedBody = await unrelatedGetRes.json() as any;
    const itemForUnrelated = unrelatedBody.Result.find((item: any) => item.Id === testItemId);
    expect(itemForUnrelated.Claims[0].ClaimedByName).toBe("Anonymous");

    await cleanUpWishlist(testListId);
  });

  test("Claim and Unclaim Lifecycle", async () => {
    // 1. Create a wishlist
    const createListRes = await app.handle(
      new Request("http://localhost/api/wishlists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${owner.token}`
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
          "Authorization": `Bearer ${owner.token}`
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
          "Authorization": `Bearer ${owner.token}`
        },
        body: JSON.stringify({
          Giftistry: {
            Lists: {
              email: collaborator.email,
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
          "Authorization": `Bearer ${collaborator.token}`
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
        headers: { "Authorization": `Bearer ${collaborator.token}` }
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
        headers: { "Authorization": `Bearer ${owner.token}` }
      })
    );
    expect(ownerUnclaimRes.status).toBe(403);

    // 6. Viewer unclaims the item
    const viewerUnclaimRes = await app.handle(
      new Request(`http://localhost/api/items/${testItemId}/claims`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${collaborator.token}` }
      })
    );
    expect(viewerUnclaimRes.status).toBe(200);

    // Verify it is unclaimed
    const getItemsRes2 = await app.handle(
      new Request(`http://localhost/api/wishlists/${testListId}/items`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${collaborator.token}` }
      })
    );
    expect(getItemsRes2.status).toBe(200);
    const items2 = await getItemsRes2.json() as any;
    const unclaimedItem = items2.Result.find((i: any) => i.Id === testItemId);
    expect(unclaimedItem.IsClaimed).toBe(false);
    expect(unclaimedItem.Claims.length).toBe(0);

    // Cleanup
    await cleanUpWishlist(testListId);
  });
});
