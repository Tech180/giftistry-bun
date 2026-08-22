import { expect, test, describe, beforeAll, afterAll } from 'bun:test';
import { app } from '../src/index';
import { createTestUser, createTestWishlist, shareTestWishlist, cleanUpUser, cleanUpWishlist } from './helper';

describe('Public link guest preview', () => {
  let owner: { token: string; userId: string; email: string };
  let collaborator: { token: string; userId: string; email: string };
  let listId: string;
  let ownerItemId: string;
  let suggestionItemId: string;
  let openToken: string;
  let passwordToken: string;

  beforeAll(async () => {
    const timestamp = Date.now();
    owner = await createTestUser(`preview_owner_${timestamp}`, `preview_owner_${timestamp}@example.com`);
    collaborator = await createTestUser(`preview_collab_${timestamp}`, `preview_collab_${timestamp}@example.com`);
    listId = await createTestWishlist(owner.token, 'Public Preview List');
    await shareTestWishlist(owner, listId, collaborator, 'collaborator');

    const ownerItemRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${owner.token}`,
        },
        body: JSON.stringify({
          Giftistry: { Items: { Name: 'Owner Catalog Item' } },
        }),
      })
    );
    const ownerItemBody = await ownerItemRes.json() as { Result: { Id: string } };
    ownerItemId = ownerItemBody.Result.Id;

    const suggestionRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${collaborator.token}`,
        },
        body: JSON.stringify({
          Giftistry: { Items: { Name: 'Secret Suggestion', IsHiddenIdea: false } },
        }),
      })
    );
    const suggestionBody = await suggestionRes.json() as { Result: { Id: string } };
    suggestionItemId = suggestionBody.Result.Id;

    await app.handle(
      new Request(`http://localhost/api/items/${ownerItemId}/claims`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${collaborator.token}`,
        },
        body: JSON.stringify({
          Giftistry: { Items: { ClaimedByName: 'Sam', Anonymous: false } },
        }),
      })
    );

    const openInviteRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/link-invites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${owner.token}`,
        },
        body: JSON.stringify({
          Giftistry: { Invites: { Role: 'viewer' } },
        }),
      })
    );
    const openInviteBody = await openInviteRes.json() as { Result: { Token: string } };
    openToken = openInviteBody.Result.Token;

    const passwordInviteRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/link-invites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${owner.token}`,
        },
        body: JSON.stringify({
          Giftistry: { Invites: { Role: 'viewer', Password: 'previewPass123' } },
        }),
      })
    );
    const passwordInviteBody = await passwordInviteRes.json() as { Result: { Token: string } };
    passwordToken = passwordInviteBody.Result.Token;
  });

  afterAll(async () => {
    await cleanUpWishlist(listId);
    await cleanUpUser(owner.userId);
    await cleanUpUser(collaborator.userId);
  });

  test('unauthenticated preview returns owner items only without claims or suggestion fields', async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/invites/link/${openToken}/preview`)
    );
    expect(res.status).toBe(200);
    const body = await res.json() as {
      Result: {
        Wishlist: { Title: string; UserId?: string };
        Items: Array<Record<string, unknown>>;
      };
    };
    expect(body.Result.Wishlist.Title).toBe('Public Preview List');
    expect(body.Result.Wishlist.UserId).toBeUndefined();
    expect(body.Result.Items).toHaveLength(1);
    const item = body.Result.Items[0];
    expect(item.Name).toBe('Owner Catalog Item');
    expect(item.IsClaimed).toBe(false);
    expect(item.Claims).toBeUndefined();
    expect(item.IsSuggestion).toBeUndefined();
    expect(item.IsHiddenIdea).toBeUndefined();
    expect(item.SuggestedByUserId).toBeUndefined();
    expect(item.Id).not.toBe(suggestionItemId);
  });

  test('password-protected preview requires a password', async () => {
    const missing = await app.handle(
      new Request(`http://localhost/api/invites/link/${passwordToken}/preview`)
    );
    expect(missing.status).toBe(401);

    const wrong = await app.handle(
      new Request(`http://localhost/api/invites/link/${passwordToken}/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Giftistry: { Invites: { Password: 'nope' } },
        }),
      })
    );
    expect(wrong.status).toBe(401);

    const ok = await app.handle(
      new Request(`http://localhost/api/invites/link/${passwordToken}/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Giftistry: { Invites: { Password: 'previewPass123' } },
        }),
      })
    );
    expect(ok.status).toBe(200);
    const body = await ok.json() as { Result: { Items: Array<{ Name: string }> } };
    expect(body.Result.Items.map((item) => item.Name)).toEqual(['Owner Catalog Item']);
  });

  test('authenticated list items still require login', async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/items`)
    );
    expect(res.status).toBe(401);
  });
});
