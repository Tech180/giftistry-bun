import { describe, expect, mock, test } from 'bun:test';
import { NotifyClaimersItemRemovedUseCase } from './notify-claimers-item-removed.use-case';
import type { EventBus } from '@/common/domain/ports/event-bus.port';
import { ItemRemovedEvent } from '../../../domain/events/item-removed.event';

describe('NotifyClaimersItemRemovedUseCase', () => {
  test('publishes ItemRemovedEvent for distinct claimers and skips owner / null UserId', async () => {
    const publish = mock(() => Promise.resolve());
    const eventBus = { publish, subscribe: mock() } as unknown as EventBus;
    const useCase = new NotifyClaimersItemRemovedUseCase(eventBus);

    await useCase.execute({
      claims: [
        { UserId: 'claimer-1' },
        { UserId: 'claimer-1' },
        { UserId: 'owner-1' },
        { UserId: null },
        { UserId: 'claimer-2' },
      ],
      itemName: 'Alt Gift',
      listId: 'list-1',
      listTitle: 'Birthday',
      excludeUserId: 'owner-1',
    });

    expect(publish).toHaveBeenCalledTimes(1);
    const event = (publish.mock.calls[0] as unknown as [ItemRemovedEvent])[0];
    expect(event).toBeInstanceOf(ItemRemovedEvent);
    expect(event.claimerUserIds.sort()).toEqual(['claimer-1', 'claimer-2']);
    expect(event.itemName).toBe('Alt Gift');
    expect(event.listId).toBe('list-1');
    expect(event.listTitle).toBe('Birthday');
  });

  test('no-ops when there are no claimers', async () => {
    const publish = mock(() => Promise.resolve());
    const eventBus = { publish, subscribe: mock() } as unknown as EventBus;
    const useCase = new NotifyClaimersItemRemovedUseCase(eventBus);

    await useCase.execute({
      claims: [{ UserId: null }],
      itemName: 'Gift',
      listId: 'list-1',
      listTitle: 'List',
    });

    expect(publish).not.toHaveBeenCalled();
  });
});
