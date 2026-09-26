import { describe, expect, mock, test } from 'bun:test';
import { NotifyGroupFundContributorsUseCase } from './notify-group-fund-contributors.use-case';
import type { CreateNotificationUseCase } from '@/modules/notifications';

describe('NotifyGroupFundContributorsUseCase', () => {
  test('notifies prior funders and skips actor and owner', async () => {
    const execute = mock(() => Promise.resolve({ Id: 'n1' }));
    const createNotification = { execute } as unknown as CreateNotificationUseCase;
    const useCase = new NotifyGroupFundContributorsUseCase(createNotification);

    await useCase.execute({
      priorClaims: [
        { UserId: 'funder-1', Amount: 20 },
        { UserId: 'funder-1', Amount: 10 },
        { UserId: 'owner-1', Amount: 5 },
        { UserId: 'actor-1', Amount: 15 },
        { UserId: null, Amount: 5 },
        { UserId: 'exclusive', Amount: null },
        { UserId: 'funder-2', Amount: 25 },
      ],
      itemId: 'item-1',
      itemName: 'Camera',
      listId: 'list-1',
      listTitle: 'Birthday',
      amount: 30,
      isStart: false,
      actorUserId: 'actor-1',
      ownerUserId: 'owner-1',
    });

    expect(execute).toHaveBeenCalledTimes(2);
    expect(execute).toHaveBeenCalledWith(
      'funder-1',
      'item_claimed',
      'Group funding contribution',
      'Someone contributed $30.00 toward "Camera" on "Birthday".',
      expect.objectContaining({
        ListId: 'list-1',
        ItemId: 'item-1',
        Amount: 30,
        IsStart: false,
      })
    );
    expect(execute).toHaveBeenCalledWith(
      'funder-2',
      'item_claimed',
      'Group funding contribution',
      'Someone contributed $30.00 toward "Camera" on "Birthday".',
      expect.objectContaining({ ItemId: 'item-1' })
    );
  });

  test('no-ops on first start when there are no prior funders', async () => {
    const execute = mock(() => Promise.resolve({ Id: 'n1' }));
    const createNotification = { execute } as unknown as CreateNotificationUseCase;
    const useCase = new NotifyGroupFundContributorsUseCase(createNotification);

    await useCase.execute({
      priorClaims: [],
      itemId: 'item-1',
      itemName: 'Camera',
      listId: 'list-1',
      listTitle: 'Birthday',
      amount: 40,
      isStart: true,
      actorUserId: 'actor-1',
      ownerUserId: 'owner-1',
    });

    expect(execute).not.toHaveBeenCalled();
  });
});
