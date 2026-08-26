import { describe, expect, mock, test } from 'bun:test';
import { NotifyClaimersItemRemovedUseCase } from './notify-claimers-item-removed.use-case';
import type { CreateNotificationUseCase } from '@/modules/notifications/application/create-notification.use-case';

describe('NotifyClaimersItemRemovedUseCase', () => {
  test('notifies distinct claimers and skips owner / null UserId', async () => {
    const execute = mock(() => Promise.resolve({ Id: 'n1' }));
    const createNotification = { execute } as unknown as CreateNotificationUseCase;
    const useCase = new NotifyClaimersItemRemovedUseCase(createNotification);

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

    expect(execute).toHaveBeenCalledTimes(2);
    expect(execute).toHaveBeenCalledWith(
      'claimer-1',
      'item_deleted',
      'Item deleted',
      '"Alt Gift" was deleted from "Birthday".',
      expect.objectContaining({ ListId: 'list-1', ItemName: 'Alt Gift', ListTitle: 'Birthday' })
    );
    expect(execute).toHaveBeenCalledWith(
      'claimer-2',
      'item_deleted',
      'Item deleted',
      '"Alt Gift" was deleted from "Birthday".',
      expect.objectContaining({ ListId: 'list-1' })
    );
  });

  test('no-ops when there are no claimers', async () => {
    const execute = mock(() => Promise.resolve({ Id: 'n1' }));
    const createNotification = { execute } as unknown as CreateNotificationUseCase;
    const useCase = new NotifyClaimersItemRemovedUseCase(createNotification);

    await useCase.execute({
      claims: [{ UserId: null }],
      itemName: 'Gift',
      listId: 'list-1',
      listTitle: 'List',
    });

    expect(execute).not.toHaveBeenCalled();
  });
});
