import type { CreateNotificationUseCase } from '@/modules/notifications';
import type { NotifyGroupFundContributorsInput } from '../interfaces/notify-group-fund-contributors-input.interface';

/**
 * Notifies prior group-fund contributors when someone else contributes.
 * Excludes the actor and the list owner. First starter has no recipients.
 */
export class NotifyGroupFundContributorsUseCase {
  constructor(private createNotification: CreateNotificationUseCase) {}

  async execute(input: NotifyGroupFundContributorsInput): Promise<void> {
    const exclude = new Set(
      [input.actorUserId, input.ownerUserId].filter(
        (id): id is string => typeof id === 'string' && id.length > 0
      )
    );

    const recipientIds = [
      ...new Set(
        input.priorClaims
          .filter((claim) => claim.Amount != null && Number(claim.Amount) > 0)
          .map((claim) => claim.UserId)
          .filter((id): id is string => typeof id === 'string' && id.length > 0)
          .filter((id) => !exclude.has(id))
      ),
    ];

    if (recipientIds.length === 0) {
      return;
    }

    const itemName = input.itemName.trim() || 'Item';
    const listTitle = input.listTitle.trim() || 'a wishlist';
    const dollars = `$${Number(input.amount).toFixed(2)}`;
    const title = input.isStart ? 'Group funding started' : 'Group funding contribution';
    const message = input.isStart
      ? `Someone started group funding for "${itemName}" on "${listTitle}" (${dollars}).`
      : `Someone contributed ${dollars} toward "${itemName}" on "${listTitle}".`;
    const metadata: Record<string, unknown> = {
      ListId: input.listId,
      ItemId: input.itemId,
      ItemName: itemName,
      ListTitle: listTitle,
      Amount: input.amount,
      IsStart: input.isStart,
    };

    for (const userId of recipientIds) {
      try {
        await this.createNotification.execute(userId, 'item_claimed', title, message, metadata);
      } catch (err) {
        console.error('[Notifications] Failed to create item_claimed notification:', err);
      }
    }
  }
}
