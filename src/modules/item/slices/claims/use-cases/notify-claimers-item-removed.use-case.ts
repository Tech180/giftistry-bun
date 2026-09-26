import type { EventBus } from '@/common/domain/ports/event-bus.port';
import type { Claim } from '../../../domain/interfaces/claim.interface';
import { ItemRemovedEvent } from '../../../domain/events/item-removed.event';
import type { NotifyClaimersItemRemovedInput } from '../interfaces/notify-claimers-item-removed-input.interface';

/**
 * Publishes ItemRemovedEvent so notifications can notify claimers without
 * item depending on CreateNotificationUseCase.
 */
export class NotifyClaimersItemRemovedUseCase {
  constructor(private eventBus: EventBus) {}

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

    await this.eventBus.publish(
      new ItemRemovedEvent(claimerIds, itemName, input.listId, listTitle)
    );
  }
}
