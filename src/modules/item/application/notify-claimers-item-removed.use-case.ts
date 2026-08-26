import type { CreateNotificationUseCase } from '@/modules/notifications/application/create-notification.use-case';
import type { Claim } from '../domain/item.entity';

export interface NotifyClaimersItemRemovedInput {
  claims: Pick<Claim, 'UserId'>[];
  itemName: string;
  listId: string;
  listTitle: string;
  /** List owner — never notified. */
  excludeUserId?: string | null;
}

/**
 * Notifies claimers that a claimed item/substitution was removed (deleted or
 * owner-approved options hidden when Allow substitutions is turned off).
 */
export class NotifyClaimersItemRemovedUseCase {
  constructor(private createNotification: CreateNotificationUseCase) {}

  async execute(input: NotifyClaimersItemRemovedInput): Promise<void> {
    const itemName = input.itemName.trim() || 'Item';
    const listTitle = input.listTitle.trim() || 'a wishlist';
    const exclude = input.excludeUserId ?? null;

    const claimerIds = [
      ...new Set(
        input.claims
          .map((claim) => claim.UserId)
          .filter((id): id is string => typeof id === 'string' && id.length > 0)
          .filter((id) => id !== exclude)
      ),
    ];

    if (claimerIds.length === 0) {
      return;
    }

    const title = 'Item deleted';
    const message = `"${itemName}" was deleted from "${listTitle}".`;
    const metadata: Record<string, unknown> = {
      ListId: input.listId,
      ItemName: itemName,
      ListTitle: listTitle,
    };

    for (const userId of claimerIds) {
      try {
        await this.createNotification.execute(userId, 'item_deleted', title, message, metadata);
      } catch (err) {
        console.error('[Notifications] Failed to create item_deleted notification:', err);
      }
    }
  }
}
