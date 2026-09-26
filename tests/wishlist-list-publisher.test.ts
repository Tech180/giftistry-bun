import { describe, expect, test } from 'bun:test';
import { WebsocketListChangedPublisher } from '../src/modules/wishlist/infrastructure/adapters/websocket-list-changed-publisher';
import { DeleteItemUseCase } from '../src/modules/item/slices/catalog/use-cases/delete-item.use-case';

describe('WebsocketListChangedPublisher', () => {
  test('no-ops when transport is unset', () => {
    const adapter = new WebsocketListChangedPublisher();
    expect(() =>
      adapter.publish('list-1', { reason: 'item.created', itemId: 'item-1' })
    ).not.toThrow();
  });

  test('invokes transport with list.changed payload', () => {
    const calls: Array<{ listId: string; payload: Record<string, unknown> }> = [];
    const adapter = new WebsocketListChangedPublisher();
    adapter.setTransport((listId, payload) => {
      calls.push({ listId, payload });
    });

    adapter.publish('list-1', {
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
  });
});

describe('DeleteItemUseCase list.changed', () => {
  test('publishes item.deleted after successful delete', async () => {
    const calls: Array<{ listId: string; event: { reason: string; itemId?: string; actorUserId?: string } }> = [];
    const listChanged = {
      publish(listId: string, event: { reason: string; itemId?: string; actorUserId?: string }) {
        calls.push({ listId, event });
      },
    };

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
      } as never,
      undefined,
      listChanged
    );

    await useCase.execute('item-1', 'owner-1');

    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual({
      listId: 'list-1',
      event: {
        reason: 'item.deleted',
        itemId: 'item-1',
        actorUserId: 'owner-1',
      },
    });
  });

  test('adapter encodes list.changed payload via transport', () => {
    const calls: Array<{ listId: string; payload: Record<string, unknown> }> = [];
    const adapter = new WebsocketListChangedPublisher();
    adapter.setTransport((listId, payload) => {
      calls.push({ listId, payload });
    });

    adapter.publish('list-1', {
      reason: 'item.deleted',
      itemId: 'item-1',
      actorUserId: 'owner-1',
    });

    expect(calls).toEqual([
      {
        listId: 'list-1',
        payload: {
          Type: 'list.changed',
          Reason: 'item.deleted',
          ItemId: 'item-1',
          ActorUserId: 'owner-1',
        },
      },
    ]);
  });
});
