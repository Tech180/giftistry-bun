import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { app } from '../src/index';
import {
  cleanUpUser,
  cleanUpWishlist,
  createTestUser,
  createTestWishlist,
  shareTestWishlist,
} from './helper';

describe('Group fund anonymous contributor visibility', () => {
  let owner: Awaited<ReturnType<typeof createTestUser>>;
  let contributorA: Awaited<ReturnType<typeof createTestUser>>;
  let contributorB: Awaited<ReturnType<typeof createTestUser>>;
  let viewerC: Awaited<ReturnType<typeof createTestUser>>;
  let listId: string;
  let itemId: string;

  beforeAll(async () => {
    const timestamp = Date.now();
    owner = await createTestUser(`gf_owner_${timestamp}`, `gf_owner_${timestamp}@example.com`);
    contributorA = await createTestUser(
      `gf_contrib_a_${timestamp}`,
      `gf_contrib_a_${timestamp}@example.com`
    );
    contributorB = await createTestUser(
      `gf_contrib_b_${timestamp}`,
      `gf_contrib_b_${timestamp}@example.com`
    );
    viewerC = await createTestUser(
      `gf_viewer_c_${timestamp}`,
      `gf_viewer_c_${timestamp}@example.com`
    );

    listId = await createTestWishlist(
      owner.token,
      'GF Anonymous Visibility List',
      new Date(Date.now() + 86400000).toISOString()
    );

    await shareTestWishlist(owner, listId, contributorA, 'collaborator');
    await shareTestWishlist(owner, listId, contributorB, 'collaborator');
    await shareTestWishlist(owner, listId, viewerC, 'viewer');

    const itemRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${owner.token}`,
        },
        body: JSON.stringify({
          Giftistry: {
            Items: {
              Name: 'Group Fund Gift',
              Description: 'Needs pooling',
              PriorityId: null,
              Category: 'generic',
              LinkUrl: 'https://example.com/gift',
              WebsiteName: 'Example',
              Price: 49.99,
            },
          },
        }),
      })
    );
    expect(itemRes.status).toBe(200);
    itemId = ((await itemRes.json()) as { Result: { Id: string } }).Result.Id;

    const claimA = await app.handle(
      new Request(`http://localhost/api/items/${itemId}/claims`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${contributorA.token}`,
        },
        body: JSON.stringify({
          Giftistry: {
            Items: {
              Amount: 30,
              ClaimedByName: 'Alice',
              Anonymous: true,
            },
          },
        }),
      })
    );
    expect(claimA.status).toBe(200);

    const claimB = await app.handle(
      new Request(`http://localhost/api/items/${itemId}/claims`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${contributorB.token}`,
        },
        body: JSON.stringify({
          Giftistry: {
            Items: {
              Amount: 19.99,
              ClaimedByName: 'Bob',
              Anonymous: true,
            },
          },
        }),
      })
    );
    expect(claimB.status).toBe(200);
  });

  afterAll(async () => {
    await cleanUpWishlist(listId);
    await cleanUpUser(owner.userId);
    await cleanUpUser(contributorA.userId);
    await cleanUpUser(contributorB.userId);
    await cleanUpUser(viewerC.userId);
  });

  test('fellow contributor sees the other contributor name', async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/items`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${contributorB.token}` },
      })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      Result: { Items: Array<{ Id: string; Claims: Array<{ ClaimedByName: string | null }> }> };
    };
    const item = body.Result.Items.find((entry) => entry.Id === itemId);
    expect(item).toBeTruthy();
    expect(item!.Claims.some((claim) => claim.ClaimedByName === 'Alice')).toBe(true);
    expect(item!.Claims.some((claim) => claim.ClaimedByName === 'Anonymous')).toBe(false);
  });

  test('non-contributor viewer sees Anonymous only', async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/items`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${viewerC.token}` },
      })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      Result: { Items: Array<{ Id: string; Claims: Array<{ ClaimedByName: string | null }> }> };
    };
    const item = body.Result.Items.find((entry) => entry.Id === itemId);
    expect(item).toBeTruthy();
    expect(item!.Claims.every((claim) => claim.ClaimedByName === 'Anonymous')).toBe(true);
  });
});
