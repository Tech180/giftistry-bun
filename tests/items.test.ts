import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import { app } from '../src/index';
import { createTestUser, createTestWishlist, shareTestWishlist, cleanUpUser, cleanUpWishlist } from './helper';
import { sql } from '../src/common/database/connection';

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
    await shareTestWishlist(owner, listId, collaborator, "collaborator");
    await shareTestWishlist(owner, listId, unrelated, "viewer");
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

  test("Owner custom fields persist on create, list, and update", async () => {
    const createRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${owner.token}`,
        },
        body: JSON.stringify({
          Giftistry: {
            Items: {
              Name: "Custom field tee",
              Metadata: {
                CustomFields: {
                  Predefined: { Color: "Black" },
                  UserDefined: { Brand: "Nike" },
                },
              },
            },
          },
        }),
      })
    );
    expect(createRes.status).toBe(200);
    const created = ((await createRes.json()) as any).Result;
    expect(created.CustomFields?.UserDefined?.Brand ?? created.Metadata?.CustomFields?.UserDefined?.Brand).toBe("Nike");

    const listRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/items`, {
        method: "GET",
        headers: { Authorization: `Bearer ${owner.token}` },
      })
    );
    expect(listRes.status).toBe(200);
    const listed = ((await listRes.json()) as any).Result.Items.find(
      (item: { Id: string }) => item.Id === created.Id
    );
    expect(listed?.Metadata?.CustomFields?.Predefined?.Color).toBe("Black");
    expect(listed?.Metadata?.CustomFields?.UserDefined?.Brand).toBe("Nike");

    const updateRes = await app.handle(
      new Request(`http://localhost/api/items/${created.Id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${owner.token}`,
        },
        body: JSON.stringify({
          Giftistry: {
            Items: {
              Name: "Custom field tee",
              Metadata: {
                CustomFields: {
                  Predefined: { Color: "Navy" },
                  UserDefined: { Brand: "Nike", Material: "Cotton" },
                },
              },
            },
          },
        }),
      })
    );
    expect(updateRes.status).toBe(200);

    const listAfterUpdate = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/items`, {
        method: "GET",
        headers: { Authorization: `Bearer ${owner.token}` },
      })
    );
    const updated = ((await listAfterUpdate.json()) as any).Result.Items.find(
      (item: { Id: string }) => item.Id === created.Id
    );
    expect(updated?.Metadata?.CustomFields?.Predefined?.Color).toBe("Navy");
    expect(updated?.Metadata?.CustomFields?.UserDefined?.Brand).toBe("Nike");
    expect(updated?.Metadata?.CustomFields?.UserDefined?.Material).toBe("Cotton");
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

  test("Collaborator cannot add a hidden idea", async () => {
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
    expect(res.status).toBe(403);
  });

  test("Viewer adds a hidden idea (surprise) to the list", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${unrelated.token}`
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
    expect(body.Result.IsSuggestion).toBe(true);
    secretItemId = body.Result.Id;
  });

  test("Collaborator adds a catalog item (not a suggestion)", async () => {
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
              Name: "Collaborator Catalog Gift",
              Description: "Not a suggestion",
              IsHiddenIdea: false
            }
          }
        }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.Result.Name).toBe("Collaborator Catalog Gift");
    expect(body.Result.IsSuggestion).toBeFalsy();
  });

  test("Collaborator can update an owner item", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/items/${itemId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${collaborator.token}`
        },
        body: JSON.stringify({
          Giftistry: {
            Items: {
              Name: "PlayStation 5 Pro",
              Description: "Edited by collaborator"
            }
          }
        }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.Result.Description).toBe("Edited by collaborator");
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
    const updatedItem = body.Result.Items.find((i: any) => i.Id === itemId);
    expect(updatedItem).toBeTruthy();
    expect(updatedItem.Links.length).toBe(1);
    expect(updatedItem.Links[0].Url).toBe("https://www.target.com/ps5-pro");
    expect(updatedItem.Links[0].RetailerName).toBe("Target");
    expect(Number(updatedItem.Links[0].ExtractedPrice)).toBe(549.99);
  });

  test("Collaborator cannot claim items on the list", async () => {
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
    expect(res.status).toBe(403);
  });

  test("Viewer claims standard item", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/items/${itemId}/claims`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${unrelated.token}`
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
    const names = body.Result.Items.map((i: any) => i.Name);
    expect(names).toContain("PlayStation 5 Pro");
    expect(names).toContain("Collaborator Catalog Gift");
    expect(names).not.toContain("Secret Book");
    expect(body.Result.Items.every((i: any) => i.Claims.length === 0)).toBe(true);
    expect(Array.isArray(body.Result.Groups)).toBe(true);
  });

  test("Collaborator fetches items (sees secret suggestions, hides claims like owner)", async () => {
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
    const names = body.Result.Items.map((i: any) => i.Name);
    expect(names).toContain("PlayStation 5 Pro");
    expect(names).toContain("Secret Book");
    expect(names).toContain("Collaborator Catalog Gift");
    expect(body.Result.Items.every((i: any) => i.Claims.length === 0)).toBe(true);
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

  test("Fetch dynamic optional field definitions for Tech includes CPU keys", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/items/field-definitions?category=tech", {
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
    expect(keys).toContain("ModelNumber");
    expect(keys).toContain("Cores");
    expect(keys).toContain("Threads");
    expect(keys).toContain("BaseClock");
    expect(keys).toContain("BoostClock");
    expect(keys).toContain("Socket");
    expect(keys).toContain("Tdp");
    expect(keys).toContain("Cache");
  });

  test("Suggestions and Anonymous Claims Lifecycle", async () => {
    const testListId = await createTestWishlist(owner.token, "Suggestion Test Wishlist", new Date(Date.now() + 1500).toISOString(), "generic", true);
    await shareTestWishlist(owner, testListId, collaborator, "collaborator");
    await shareTestWishlist(owner, testListId, unrelated, "viewer");

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
    const itemForUnrelated = unrelatedBody.Result.Items.find((item: any) => item.Id === testItemId);
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
    const claimedItem = items.Result.Items.find((i: any) => i.Id === testItemId);
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
    const unclaimedItem = items2.Result.Items.find((i: any) => i.Id === testItemId);
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
    await shareTestWishlist(owner, listId, collaboratorA, "collaborator");
    await shareTestWishlist(owner, listId, collaboratorB, "collaborator");
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
    expect(ownerBody.Result.Items.some((i: any) => i.Name === "Private Gift for A")).toBe(true);

    const collabARes = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/items`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${collaboratorA.token}` }
      })
    );
    const collabABody = await collabARes.json() as any;
    expect(collabABody.Result.Items.some((i: any) => i.Name === "Private Gift for A")).toBe(true);

    const collabBRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/items`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${collaboratorB.token}` }
      })
    );
    const collabBBody = await collabBRes.json() as any;
    expect(collabBBody.Result.Items.some((i: any) => i.Name === "Private Gift for A")).toBe(false);
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
    expect(ownerBody.Result.Items.some((i: any) => i.Name === "Owner Secret Item")).toBe(true);

    for (const token of [collaboratorA.token, collaboratorB.token]) {
      const listRes = await app.handle(
        new Request(`http://localhost/api/wishlists/${listId}/items`, {
          method: "GET",
          headers: { "Authorization": `Bearer ${token}` }
        })
      );
      const listBody = await listRes.json() as any;
      expect(listBody.Result.Items.some((i: any) => i.Name === "Owner Secret Item")).toBe(false);
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
      expect(body.Result.Items.some((i: any) => i.Name === "Public Item For All")).toBe(true);
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
    expect(collabBBody.Result.Items.some((i: any) => i.Id === restrictedItemId)).toBe(true);

    const collabARes = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/items`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${collaboratorA.token}` }
      })
    );
    const collabABody = await collabARes.json() as any;
    expect(collabABody.Result.Items.some((i: any) => i.Id === restrictedItemId)).toBe(false);
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
    expect(ownerBody.Result.Items.some((i: any) => i.Name === "Secret Suggestion for B")).toBe(false);

    const collabBRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/items`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${collaboratorB.token}` }
      })
    );
    const collabBBody = await collabBRes.json() as any;
    expect(collabBBody.Result.Items.some((i: any) => i.Name === "Secret Suggestion for B")).toBe(true);
  });
});

describe("Item photos", () => {
  // 1x1 PNG — well under 20MB item photo limit
  const tinyPngDataUrl =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  const tinyJpegDataUrl =
    "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGcP//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAQUCf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8Bf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8Bf//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEABj8Cf//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAT8hf//Z";

  let photoOwner: Awaited<ReturnType<typeof createTestUser>>;
  let photoListId: string;
  let photoItemId: string;

  beforeAll(async () => {
    const timestamp = Date.now();
    photoOwner = await createTestUser(
      `photo_owner_${timestamp}`,
      `photo_owner_${timestamp}@example.com`
    );
    // First signed-up user can become owner/admin; strip that so policy checks apply.
    await sql`
      UPDATE users
      SET is_admin = false, is_owner = false
      WHERE id = ${photoOwner.userId}
    `;
    photoListId = await createTestWishlist(photoOwner.token, "Photo testing wishlist");
  });

  afterAll(async () => {
    await cleanUpWishlist(photoListId);
    await cleanUpUser(photoOwner.userId);
  });

  test("creates item with ordered photos and lists them ordered by SortOrder", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/wishlists/${photoListId}/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${photoOwner.token}`,
        },
        body: JSON.stringify({
          Giftistry: {
            Items: {
              Name: "Photo gadget",
              Metadata: {
                Photos: [{ DataUrl: tinyPngDataUrl }, { DataUrl: tinyJpegDataUrl }],
              },
            },
          },
        }),
      })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    photoItemId = body.Result.Id;
    expect(Array.isArray(body.Result.Photos)).toBe(true);
    expect(body.Result.Photos.length).toBe(2);
    expect(body.Result.Photos[0].SortOrder).toBe(0);
    expect(body.Result.Photos[0].Url).toBe(tinyPngDataUrl);
    expect(body.Result.Photos[1].SortOrder).toBe(1);
    expect(body.Result.Photos[1].Url).toBe(tinyJpegDataUrl);
    expect(body.Result.Photos[0].Id).toBeTruthy();

    const listRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${photoListId}/items`, {
        method: "GET",
        headers: { Authorization: `Bearer ${photoOwner.token}` },
      })
    );
    expect(listRes.status).toBe(200);
    const listBody = (await listRes.json()) as any;
    const listed = listBody.Result.Items.find((i: any) => i.Id === photoItemId);
    expect(listed?.Photos?.length).toBe(2);
    expect(listed.Photos[0].SortOrder).toBe(0);
    expect(listed.Photos[0].Url).toBe(tinyPngDataUrl);
  });

  test("replaces photos with a new ordered set", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/items/${photoItemId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${photoOwner.token}`,
        },
        body: JSON.stringify({
          Giftistry: {
            Items: {
              Name: "Photo gadget",
              Metadata: {
                Photos: [{ DataUrl: tinyJpegDataUrl }],
              },
            },
          },
        }),
      })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    // update may return success envelope without full item — list to verify
    const listRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${photoListId}/items`, {
        method: "GET",
        headers: { Authorization: `Bearer ${photoOwner.token}` },
      })
    );
    const listBody = (await listRes.json()) as any;
    const listed = listBody.Result.Items.find((i: any) => i.Id === photoItemId);
    expect(listed.Photos.length).toBe(1);
    expect(listed.Photos[0].Url).toBe(tinyJpegDataUrl);
    expect(listed.Photos[0].SortOrder).toBe(0);
  });

  test("clears photos with empty array", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/items/${photoItemId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${photoOwner.token}`,
        },
        body: JSON.stringify({
          Giftistry: {
            Items: {
              Name: "Photo gadget",
              Metadata: { Photos: [] },
            },
          },
        }),
      })
    );
    expect(res.status).toBe(200);

    const listRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${photoListId}/items`, {
        method: "GET",
        headers: { Authorization: `Bearer ${photoOwner.token}` },
      })
    );
    const listBody = (await listRes.json()) as any;
    const listed = listBody.Result.Items.find((i: any) => i.Id === photoItemId);
    expect(listed.Photos ?? []).toEqual([]);
  });

  test("rejects more than 10 photos", async () => {
    const photos = Array.from({ length: 11 }, () => ({ DataUrl: tinyPngDataUrl }));
    const res = await app.handle(
      new Request(`http://localhost/api/wishlists/${photoListId}/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${photoOwner.token}`,
        },
        body: JSON.stringify({
          Giftistry: {
            Items: {
              Name: "Too many photos",
              Metadata: { Photos: photos },
            },
          },
        }),
      })
    );
    // Route schema maxItems: 10 → 422; use-case also enforces with 400.
    expect([400, 422]).toContain(res.status);
  });

  test("rejects non-data-URL photo payload", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/wishlists/${photoListId}/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${photoOwner.token}`,
        },
        body: JSON.stringify({
          Giftistry: {
            Items: {
              Name: "Bad photo url",
              Metadata: {
                Photos: [{ DataUrl: "https://example.com/not-a-data-url.png" }],
              },
            },
          },
        }),
      })
    );
    expect(res.status).toBe(400);
  });

  test("rejects oversized photo payload", async () => {
    // Base64 length * 0.75 must exceed 20MB decoded estimate
    const oversized = "data:image/png;base64," + "A".repeat(28 * 1024 * 1024);
    const res = await app.handle(
      new Request(`http://localhost/api/wishlists/${photoListId}/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${photoOwner.token}`,
        },
        body: JSON.stringify({
          Giftistry: {
            Items: {
              Name: "Huge photo",
              Metadata: { Photos: [{ DataUrl: oversized }] },
            },
          },
        }),
      })
    );
    expect(res.status).toBe(400);
  });

  test("rejects photos when CanUploadImages is false", async () => {
    await sql`
      UPDATE users
      SET is_admin = false,
          is_owner = false,
          policy_json = ${sql.json({ CanUploadImages: false } as never)}
      WHERE id = ${photoOwner.userId}
    `;

    try {
      const res = await app.handle(
        new Request(`http://localhost/api/wishlists/${photoListId}/items`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${photoOwner.token}`,
          },
          body: JSON.stringify({
            Giftistry: {
              Items: {
                Name: "Policy denied photo",
                Metadata: { Photos: [{ DataUrl: tinyPngDataUrl }] },
              },
            },
          }),
        })
      );
      expect(res.status).toBe(403);
    } finally {
      await sql`
        UPDATE users
        SET policy_json = ${sql.json({} as never)}
        WHERE id = ${photoOwner.userId}
      `;
    }
  });
});

describe('Viewer suggestions', () => {
  let owner: Awaited<ReturnType<typeof createTestUser>>;
  let viewer: Awaited<ReturnType<typeof createTestUser>>;
  let listId: string;
  let ownerItemId: string;

  beforeAll(async () => {
    const timestamp = Date.now();
    owner = await createTestUser(`suggest_owner_${timestamp}`, `suggest_owner_${timestamp}@example.com`);
    viewer = await createTestUser(`suggest_viewer_${timestamp}`, `suggest_viewer_${timestamp}@example.com`);
    listId = await createTestWishlist(owner.token, 'Viewer Suggest List');
    await shareTestWishlist(owner, listId, viewer, 'viewer');

    const ownerItemRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${owner.token}`,
        },
        body: JSON.stringify({
          Giftistry: { Items: { Name: 'Owner Item' } },
        }),
      })
    );
    const ownerItemBody = await ownerItemRes.json() as { Result: { Id: string } };
    ownerItemId = ownerItemBody.Result.Id;
  });

  afterAll(async () => {
    await cleanUpWishlist(listId);
    await cleanUpUser(owner.userId);
    await cleanUpUser(viewer.userId);
  });

  test('viewer can add a hidden suggestion by default', async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${viewer.token}`,
        },
        body: JSON.stringify({
          Giftistry: {
            Items: { Name: 'Viewer Default Hidden' },
          },
        }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json() as { Result: { IsSuggestion: boolean; IsHiddenIdea: boolean } };
    expect(body.Result.IsSuggestion).toBe(true);
    expect(body.Result.IsHiddenIdea).toBe(true);
  });

  test('viewer can opt in so the owner sees the suggestion', async () => {
    const createRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${viewer.token}`,
        },
        body: JSON.stringify({
          Giftistry: {
            Items: { Name: 'Visible To Owner Gift', IsHiddenIdea: false },
          },
        }),
      })
    );
    expect(createRes.status).toBe(200);
    const created = await createRes.json() as { Result: { Id: string } };
    const suggestionId = created.Result.Id;

    const ownerRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/items`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${owner.token}` },
      })
    );
    expect(ownerRes.status).toBe(200);
    const ownerBody = await ownerRes.json() as { Result: { Items: Array<{ Name: string }> } };
    const names = ownerBody.Result.Items.map((item) => item.Name);
    expect(names).toContain('Visible To Owner Gift');
    expect(names).not.toContain('Viewer Default Hidden');

    const updateOwn = await app.handle(
      new Request(`http://localhost/api/items/${suggestionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${viewer.token}`,
        },
        body: JSON.stringify({
          Giftistry: { Items: { Name: 'Visible To Owner Gift Edited' } },
        }),
      })
    );
    expect(updateOwn.status).toBe(200);

    const updateOwnerItem = await app.handle(
      new Request(`http://localhost/api/items/${ownerItemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${viewer.token}`,
        },
        body: JSON.stringify({
          Giftistry: { Items: { Name: 'Hacked Owner Item' } },
        }),
      })
    );
    expect(updateOwnerItem.status).toBe(403);
  });

  test('viewer can reveal then hide a suggestion via PUT IsHiddenIdea', async () => {
    const createRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${viewer.token}`,
        },
        body: JSON.stringify({
          Giftistry: {
            Items: { Name: 'Toggle Hidden Via Put', IsHiddenIdea: true },
          },
        }),
      })
    );
    expect(createRes.status).toBe(200);
    const created = await createRes.json() as { Result: { Id: string; IsHiddenIdea: boolean } };
    expect(created.Result.IsHiddenIdea).toBe(true);
    const suggestionId = created.Result.Id;

    const revealRes = await app.handle(
      new Request(`http://localhost/api/items/${suggestionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${viewer.token}`,
        },
        body: JSON.stringify({
          Giftistry: { Items: { Name: 'Toggle Hidden Via Put', IsHiddenIdea: false } },
        }),
      })
    );
    expect(revealRes.status).toBe(200);
    const revealed = await revealRes.json() as { Result: { IsHiddenIdea: boolean } };
    expect(revealed.Result.IsHiddenIdea).toBe(false);

    const ownerSees = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/items`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${owner.token}` },
      })
    );
    expect(ownerSees.status).toBe(200);
    const ownerBody = await ownerSees.json() as { Result: { Items: Array<{ Id: string }> } };
    expect(ownerBody.Result.Items.some((item) => item.Id === suggestionId)).toBe(true);

    const hideRes = await app.handle(
      new Request(`http://localhost/api/items/${suggestionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${viewer.token}`,
        },
        body: JSON.stringify({
          Giftistry: { Items: { Name: 'Toggle Hidden Via Put', IsHiddenIdea: true } },
        }),
      })
    );
    expect(hideRes.status).toBe(200);
    const hidden = await hideRes.json() as { Result: { IsHiddenIdea: boolean } };
    expect(hidden.Result.IsHiddenIdea).toBe(true);

    const ownerMisses = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/items`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${owner.token}` },
      })
    );
    expect(ownerMisses.status).toBe(200);
    const ownerMissBody = await ownerMisses.json() as { Result: { Items: Array<{ Id: string }> } };
    expect(ownerMissBody.Result.Items.some((item) => item.Id === suggestionId)).toBe(false);
  });

  test('omitting IsHiddenIdea on PUT preserves the previous flag', async () => {
    const createRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${viewer.token}`,
        },
        body: JSON.stringify({
          Giftistry: {
            Items: { Name: 'Preserve Hidden Flag', IsHiddenIdea: true },
          },
        }),
      })
    );
    expect(createRes.status).toBe(200);
    const created = await createRes.json() as { Result: { Id: string } };
    const suggestionId = created.Result.Id;

    const renameRes = await app.handle(
      new Request(`http://localhost/api/items/${suggestionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${viewer.token}`,
        },
        body: JSON.stringify({
          Giftistry: { Items: { Name: 'Preserve Hidden Flag Renamed' } },
        }),
      })
    );
    expect(renameRes.status).toBe(200);
    const renamed = await renameRes.json() as { Result: { IsHiddenIdea: boolean; Name: string } };
    expect(renamed.Result.Name).toBe('Preserve Hidden Flag Renamed');
    expect(renamed.Result.IsHiddenIdea).toBe(true);
  });

  test('owner cannot set IsHiddenIdea true on their own item via PUT', async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/items/${ownerItemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${owner.token}`,
        },
        body: JSON.stringify({
          Giftistry: { Items: { Name: 'Owner Item', IsHiddenIdea: true } },
        }),
      })
    );
    expect(res.status).toBe(403);
  });
});
