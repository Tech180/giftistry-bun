import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { app } from '../src/index';
import {
  cleanUpUser,
  cleanUpWishlist,
  createTestUser,
  createTestWishlist,
  shareTestWishlist,
} from './helper';

async function waitForMentionNotifications() {
  await new Promise((resolve) => setTimeout(resolve, 150));
}

describe('comment mention notifications', () => {
  let owner: Awaited<ReturnType<typeof createTestUser>>;
  let collaborator: Awaited<ReturnType<typeof createTestUser>>;
  let listId: string;

  beforeAll(async () => {
    const timestamp = Date.now();
    owner = await createTestUser(`mention_owner_${timestamp}`, `mention_owner_${timestamp}@example.com`);
    collaborator = await createTestUser(
      `mention_collab_${timestamp}`,
      `mention_collab_${timestamp}@example.com`
    );
    listId = await createTestWishlist(owner.token, 'Mention Test List');
    await shareTestWishlist(owner, listId, collaborator, 'collaborator');
  });

  afterAll(async () => {
    await cleanUpWishlist(listId);
    await cleanUpUser(owner.userId);
    await cleanUpUser(collaborator.userId);
  });

  test('creates comment notification for mentioned collaborator', async () => {
    const postRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${owner.token}`,
        },
        body: JSON.stringify({
          Giftistry: {
            Comments: {
              Content: `Heads up [Collab](user:${collaborator.userId})`,
              IsOwnerVisible: true,
            },
          },
        }),
      })
    );
    expect(postRes.status).toBe(200);
    const postBody = (await postRes.json()) as { Result: { Id: string } };
    const commentId = postBody.Result.Id;

    await waitForMentionNotifications();

    const inboxRes = await app.handle(
      new Request('http://localhost/api/notifications', {
        headers: { Authorization: `Bearer ${collaborator.token}` },
      })
    );
    expect(inboxRes.status).toBe(200);
    const inboxBody = (await inboxRes.json()) as {
      Result: Array<{ Type: string; Metadata?: Record<string, string> }>;
    };

    const mentionNotice = inboxBody.Result.find(
      (n) =>
        n.Type === 'comment' &&
        n.Metadata?.CommentId === commentId &&
        n.Metadata?.ListId === listId
    );
    expect(mentionNotice).toBeDefined();
  });

  test('does not notify owner mentioned on hidden-from-owner comment', async () => {
    const beforeRes = await app.handle(
      new Request('http://localhost/api/notifications', {
        headers: { Authorization: `Bearer ${owner.token}` },
      })
    );
    const beforeBody = (await beforeRes.json()) as { Result: Array<{ Type: string }> };
    const beforeCount = beforeBody.Result.filter((n) => n.Type === 'comment').length;

    const postRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${collaborator.token}`,
        },
        body: JSON.stringify({
          Giftistry: {
            Comments: {
              Content: `Sorry [Owner](user:${owner.userId})`,
              IsOwnerVisible: false,
            },
          },
        }),
      })
    );
    expect(postRes.status).toBe(200);

    await waitForMentionNotifications();

    const afterRes = await app.handle(
      new Request('http://localhost/api/notifications', {
        headers: { Authorization: `Bearer ${owner.token}` },
      })
    );
    const afterBody = (await afterRes.json()) as { Result: Array<{ Type: string }> };
    const afterCount = afterBody.Result.filter((n) => n.Type === 'comment').length;

    expect(afterCount).toBe(beforeCount);
  });
});
