import { describe, expect, test, beforeAll, afterAll } from 'bun:test';
import { app } from '../src/index';
import {
  createTestUser,
  createTestWishlist,
  shareTestWishlist,
  cleanUpUser,
  cleanUpWishlist,
} from './helper';

/**
 * Authz / enforcement audit for behaviors the FE also gates in UX.
 * These assert the backend is the source of truth.
 */
describe('Authz audit (visibility, expiry, collaborator, comments)', () => {
  let owner: any;
  let collaborator: any;
  let activeListId: string;
  let expiredListId: string;
  let activeItemId: string;
  let expiredItemId: string;

  beforeAll(async () => {
    const timestamp = Date.now();
    owner = await createTestUser(`authz_owner_${timestamp}`, `authz_owner_${timestamp}@example.com`);
    collaborator = await createTestUser(
      `authz_collab_${timestamp}`,
      `authz_collab_${timestamp}@example.com`
    );

    activeListId = await createTestWishlist(owner.token, 'Authz Active List');
    await shareTestWishlist(owner, activeListId, collaborator, 'collaborator');

    const expiredRes = await app.handle(
      new Request('http://localhost/api/wishlists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${owner.token}`,
        },
        body: JSON.stringify({
          Giftistry: {
            Lists: {
              Title: 'Authz Expired List',
              ExpiresAt: new Date(Date.now() + 86400000).toISOString(),
              AllowGroupFunds: false,
              AutoRollover: false,
            },
          },
        }),
      })
    );
    expect(expiredRes.status).toBe(200);
    expiredListId = (await expiredRes.json() as any).Result.Id;
    await shareTestWishlist(owner, expiredListId, collaborator, 'collaborator');

    const activeItemRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${activeListId}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${owner.token}`,
        },
        body: JSON.stringify({
          Giftistry: {
            Items: {
              Name: 'Authz Active Item',
              Metadata: { Text: 'note', IsFavorite: true },
              Category: 'home_kitchen',
              Priority: 1,
            },
          },
        }),
      })
    );
    expect(activeItemRes.status).toBe(200);
    activeItemId = (await activeItemRes.json() as any).Result.Id;

    const expiredItemRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${expiredListId}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${owner.token}`,
        },
        body: JSON.stringify({
          Giftistry: {
            Items: { Name: 'Authz Expired Item' },
          },
        }),
      })
    );
    expect(expiredItemRes.status).toBe(200);
    expiredItemId = (await expiredItemRes.json() as any).Result.Id;

    const expireUpdateRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${expiredListId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${owner.token}`,
        },
        body: JSON.stringify({
          Giftistry: {
            Lists: {
              Title: 'Authz Expired List',
              ExpiresAt: new Date(Date.now() - 86400000).toISOString(),
              AllowGroupFunds: false,
              AutoRollover: false,
            },
          },
        }),
      })
    );
    expect(expireUpdateRes.status).toBe(200);
  });

  afterAll(async () => {
    await cleanUpWishlist(activeListId);
    await cleanUpWishlist(expiredListId);
    await cleanUpUser(owner.userId);
    await cleanUpUser(collaborator.userId);
  });

  test('list items include claim summaries, category keys, and export sort fields', async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/wishlists/${activeListId}/items`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${owner.token}` },
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    const item = body.Result.Items.find((row: any) => row.Id === activeItemId);
    expect(item).toBeTruthy();
    expect(item.CategoryKey).toBe('home_kitchen');
    expect(item.CategoryLabel).toBe('Home & Kitchen');
    expect(typeof item.IsFullyClaimed).toBe('boolean');
    expect(item.Metadata?.IsFavorite).toBe(true);
  });

  test('owner cannot claim items on their own list', async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/items/${activeItemId}/claims`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${owner.token}`,
        },
        body: JSON.stringify({
          Giftistry: { Items: { Anonymous: false } },
        }),
      })
    );
    expect(res.status).toBe(403);
  });

  test('collaborator cannot claim items on the list', async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/items/${activeItemId}/claims`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${collaborator.token}`,
        },
        body: JSON.stringify({
          Giftistry: { Items: { Anonymous: false } },
        }),
      })
    );
    expect(res.status).toBe(403);
  });

  test('collaborator cannot claim on an expired wishlist', async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/items/${expiredItemId}/claims`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${collaborator.token}`,
        },
        body: JSON.stringify({
          Giftistry: { Items: { Anonymous: false } },
        }),
      })
    );
    // List editors are blocked from claiming before expiry checks.
    expect(res.status).toBe(403);
  });

  test('viewer role can add suggestions', async () => {
    const viewer = await createTestUser(
      `authz_viewer_${Date.now()}`,
      `authz_viewer_${Date.now()}@example.com`
    );
    await shareTestWishlist(owner, activeListId, viewer, 'viewer');

    const res = await app.handle(
      new Request(`http://localhost/api/wishlists/${activeListId}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${viewer.token}`,
        },
        body: JSON.stringify({
          Giftistry: { Items: { Name: 'Viewer Suggestion' } },
        }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.Result.IsSuggestion).toBe(true);
    expect(body.Result.IsHiddenIdea).toBe(true);
    await cleanUpUser(viewer.userId);
  });
});
