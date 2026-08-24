import { describe, expect, test } from 'bun:test';
import {
  publishListChanged,
  setListChangedPublisher,
} from '../src/modules/wishlist/infrastructure/wishlist-list-publisher';
import { DeleteItemUseCase } from '../src/modules/item/application/delete-item.use-case';

describe('wishlist-list-publisher', () => {
  test('no-ops when publisher is unset', () => {
    setListChangedPublisher(null);
    expect(() =>
      publishListChanged('list-1', { reason: 'item.created', itemId: 'item-1' })
    ).not.toThrow();
  });

  test('invokes publisher with list.changed payload', () => {
    const calls: Array<{ listId: string; payload: Record<string, unknown> }> = [];
    setListChangedPublisher((listId, payload) => {
      calls.push({ listId, payload });
    });

    publishListChanged('list-1', {
      reason: 'claim.changed',
      itemId: 'item-9',
      actorUserId: 'user-2',
    });

    expect(calls).toEqual([
      {
        listId: 'list-1',
        payload: {
          Type: 'list.changed',
          Reason: 'claim.changed',
          ItemId: 'item-9',
          ActorUserId: 'user-2',
        },
      },
    ]);

    setListChangedPublisher(null);
  });
});

describe('DeleteItemUseCase list.changed', () => {
  test('publishes item.deleted after successful delete', async () => {
    const calls: Array<{ listId: string; payload: Record<string, unknown> }> = [];
    setListChangedPublisher((listId, payload) => {
      calls.push({ listId, payload });
    });

    const useCase = new DeleteItemUseCase(
      {
        delete: async () => undefined,
      } as never,
      {
        execute: async () => ({
          item: { Id: 'item-1', ListId: 'list-1', SuggestedByUserId: null },
          wishlist: {
            Id: 'list-1',
            UserId: 'owner-1',
            IsActive: true,
            ExpiresAt: null,
          },
          audienceUserIds: [],
        }),
      } as never
    );

    await useCase.execute('item-1', 'owner-1');

    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual({
      listId: 'list-1',
      payload: {
        Type: 'list.changed',
        Reason: 'item.deleted',
        ItemId: 'item-1',
        ActorUserId: 'owner-1',
      },
    });

    setListChangedPublisher(null);
  });
});
