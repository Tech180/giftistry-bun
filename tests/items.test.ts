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
              Name: "PlayStation 5 Pro",
              Description: "For gaming",
              IsHiddenIdea: false
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
              Name: "Secret Surprise",
              IsHiddenIdea: true
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
              Name: "Secret Book",
              Description: "Surprise book!",
              IsHiddenIdea: true
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
              Url: "https://www.amazon.com/PlayStation-5-Pro"
            }
          }
        }),
      })
    );
    expect(res.status).toBe(200);
  });

  test("Owner updates item link, website name, and price on edit", async () => {
    const updateRes = await app.handle(
      new Request(`http://localhost/api/items/${itemId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${owner.token}`
        },
        body: JSON.stringify({
          Giftistry: {
            Items: {
              Name: "PlayStation 5 Pro",
              LinkUrl: "https://www.target.com/ps5-pro",
              WebsiteName: "Target",
              Price: 549.99
            }
          }
        }),
      })
    );
    expect(updateRes.status).toBe(200);

    const listRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/items`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${collaborator.token}`
        }
      })
    );
    expect(listRes.status).toBe(200);
    const body = await listRes.json() as any;
    const updatedItem = body.Result.find((i: any) => i.Id === itemId);
    expect(updatedItem).toBeTruthy();
    expect(updatedItem.Links.length).toBe(1);
    expect(updatedItem.Links[0].Url).toBe("https://www.target.com/ps5-pro");
    expect(updatedItem.Links[0].RetailerName).toBe("Target");
    expect(Number(updatedItem.Links[0].ExtractedPrice)).toBe(549.99);
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
              Amount: 50.00,
              ClaimedByName: "Santa Claus"
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
              Amount: 10.00
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
            Items: { Name: "Temp Item to Delete", Description: "Transient" }
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
    expect(keys).toContain("PantsSize");
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
              Name: "Collaborator Suggestion Item",
              Description: "Hope they like it!",
              PriorityId: null,
              Category: "generic"
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
              ClaimedByName: "Collab Guy",
              Anonymous: true
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
              Title: "Unclaim Test List",
              ExpiresAt: new Date(Date.now() + 86400000).toISOString(),
              AllowGroupFunds: false,
              Category: "Tech"
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
              Name: "Unclaimable Item",
              Category: "Tech"
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
              Email: collaborator.email,
              Role: "viewer"
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
              ClaimedByName: "Claimer Friend"
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

describe("Item Audience Restriction", () => {
  let owner: any;
  let collaboratorA: any;
  let collaboratorB: any;
  let listId: string;
  let restrictedItemId: string;

  beforeAll(async () => {
    const timestamp = Date.now();
    owner = await createTestUser(`aud_owner_${timestamp}`, `aud_owner_${timestamp}@example.com`);
    collaboratorA = await createTestUser(`aud_collab_a_${timestamp}`, `aud_collab_a_${timestamp}@example.com`);
    collaboratorB = await createTestUser(`aud_collab_b_${timestamp}`, `aud_collab_b_${timestamp}@example.com`);

    listId = await createTestWishlist(owner.token, "Audience Test Wishlist");
    await shareTestWishlist(owner.token, listId, collaboratorA.email, "collaborator");
    await shareTestWishlist(owner.token, listId, collaboratorB.email, "collaborator");
  });

  afterAll(async () => {
    await cleanUpWishlist(listId);
    await cleanUpUser(owner.userId);
    await cleanUpUser(collaboratorA.userId);
    await cleanUpUser(collaboratorB.userId);
  });

  test("Owner creates restricted item for collaborator A only", async () => {
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
              Name: "Private Gift for A",
              SharedWithUserIds: [collaboratorA.userId]
            }
          }
        }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.Result.Name).toBe("Private Gift for A");
    expect(body.Result.SharedWith?.length).toBe(1);
    expect(body.Result.SharedWith[0].UserId).toBe(collaboratorA.userId);
    restrictedItemId = body.Result.Id;
  });

  test("Owner and collaborator A see restricted item; collaborator B does not", async () => {
    const ownerRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/items`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${owner.token}` }
      })
    );
    const ownerBody = await ownerRes.json() as any;
    expect(ownerBody.Result.some((i: any) => i.Name === "Private Gift for A")).toBe(true);

    const collabARes = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/items`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${collaboratorA.token}` }
      })
    );
    const collabABody = await collabARes.json() as any;
    expect(collabABody.Result.some((i: any) => i.Name === "Private Gift for A")).toBe(true);

    const collabBRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/items`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${collaboratorB.token}` }
      })
    );
    const collabBBody = await collabBRes.json() as any;
    expect(collabBBody.Result.some((i: any) => i.Name === "Private Gift for A")).toBe(false);
  });

  test("Owner creates Only Me item hidden from collaborators", async () => {
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
              Name: "Owner Secret Item",
              SharedWithUserIds: [owner.userId]
            }
          }
        }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.Result.Name).toBe("Owner Secret Item");
    expect(body.Result.SharedWith?.length).toBe(1);
    expect(body.Result.SharedWith[0].UserId).toBe(owner.userId);

    const ownerRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/items`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${owner.token}` }
      })
    );
    const ownerBody = await ownerRes.json() as any;
    expect(ownerBody.Result.some((i: any) => i.Name === "Owner Secret Item")).toBe(true);

    for (const token of [collaboratorA.token, collaboratorB.token]) {
      const listRes = await app.handle(
        new Request(`http://localhost/api/wishlists/${listId}/items`, {
          method: "GET",
          headers: { "Authorization": `Bearer ${token}` }
        })
      );
      const listBody = await listRes.json() as any;
      expect(listBody.Result.some((i: any) => i.Name === "Owner Secret Item")).toBe(false);
    }
  });

  test("Collaborator B cannot claim restricted item", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/items/${restrictedItemId}/claims`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${collaboratorB.token}`
        },
        body: JSON.stringify({
          Giftistry: {
            Items: {
              ClaimedByName: "Should Fail"
            }
          }
        }),
      })
    );
    expect(res.status).toBe(404);
  });

  test("Owner creates everyone item without sharedWithUserIds (backward compatible)", async () => {
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
              Name: "Public Item For All"
            }
          }
        }),
      })
    );
    expect(res.status).toBe(200);

    for (const token of [owner.token, collaboratorA.token, collaboratorB.token]) {
      const listRes = await app.handle(
        new Request(`http://localhost/api/wishlists/${listId}/items`, {
          method: "GET",
          headers: { "Authorization": `Bearer ${token}` }
        })
      );
      const body = await listRes.json() as any;
      expect(body.Result.some((i: any) => i.Name === "Public Item For All")).toBe(true);
    }
  });

  test("Update audience on edit changes visibility", async () => {
    const updateRes = await app.handle(
      new Request(`http://localhost/api/items/${restrictedItemId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${owner.token}`
        },
        body: JSON.stringify({
          Giftistry: {
            Items: {
              Name: "Private Gift for A",
              SharedWithUserIds: [collaboratorB.userId]
            }
          }
        }),
      })
    );
    expect(updateRes.status).toBe(200);

    const collabBRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/items`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${collaboratorB.token}` }
      })
    );
    const collabBBody = await collabBRes.json() as any;
    expect(collabBBody.Result.some((i: any) => i.Id === restrictedItemId)).toBe(true);

    const collabARes = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/items`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${collaboratorA.token}` }
      })
    );
    const collabABody = await collabARes.json() as any;
    expect(collabABody.Result.some((i: any) => i.Id === restrictedItemId)).toBe(false);
  });

  test("Collaborator creates restricted suggestion hidden from owner", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${collaboratorA.token}`
        },
        body: JSON.stringify({
          Giftistry: {
            Items: {
              Name: "Secret Suggestion for B",
              IsHiddenIdea: true,
              SharedWithUserIds: [collaboratorB.userId]
            }
          }
        }),
      })
    );
    expect(res.status).toBe(200);

    const ownerRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/items`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${owner.token}` }
      })
    );
    const ownerBody = await ownerRes.json() as any;
    expect(ownerBody.Result.some((i: any) => i.Name === "Secret Suggestion for B")).toBe(false);

    const collabBRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/items`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${collaboratorB.token}` }
      })
    );
    const collabBBody = await collabBRes.json() as any;
    expect(collabBBody.Result.some((i: any) => i.Name === "Secret Suggestion for B")).toBe(true);
  });
});
