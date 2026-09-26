import type { ItemRepository } from '../../../domain/ports/item.repository';
import { AppError } from '@/common/domain/errors/app-error';
import type { ListChangedPublisher } from '@/modules/wishlist';
import {
  getForwardRelatedIds,
  resolveRelatedGroupMemberIds,
} from '../../../domain/utils/resolve-item-link-group.util';

export class SyncItemRelatedUseCase {
  constructor(
    private itemRepo: ItemRepository,
    private listChanged: ListChangedPublisher
  ) {}

  async execute(currentItemId: string, targetItemIds: string[], currentUserId: string): Promise<void> {
    const currentItem = await this.itemRepo.findById(currentItemId);
    if (!currentItem) {
      throw new AppError('Item not found', 404, 'NOT_FOUND');
    }

    const wishlistItems = await this.itemRepo.findByListId(currentItem.ListId);

    const getRelatedItemIds = (itemId: string): string[] => {
      const item = wishlistItems.find((i) => i.Id === itemId);
      if (!item) return [];
      return getForwardRelatedIds(item);
    };

    const newGroup = new Set([currentItemId, ...targetItemIds]);
    const oldGroupIds = resolveRelatedGroupMemberIds(currentItemId, wishlistItems);
    const oldGroup = new Set([currentItemId, ...oldGroupIds]);

    const itemsToUpdate = new Set<string>([...oldGroup, ...newGroup]);
    let didChange = false;

    for (const itemId of itemsToUpdate) {
      const item = wishlistItems.find((i) => i.Id === itemId);
      if (!item) continue;

      let targetRelated: string[];
      if (newGroup.has(itemId)) {
        targetRelated = [...newGroup].filter((id) => id !== itemId);
      } else {
        const existing = getRelatedItemIds(itemId);
        targetRelated = existing.filter((id) => !oldGroup.has(id));
      }

      const existing = getRelatedItemIds(itemId);
      const unchanged =
        existing.length === targetRelated.length &&
        existing.every((id) => targetRelated.includes(id));

      if (unchanged) continue;

      await this.itemRepo.replaceRelatedItemIds(itemId, targetRelated);
      item.RelatedItemIds = targetRelated;
      didChange = true;
    }

    if (didChange) {
      this.listChanged.publish(currentItem.ListId, {
        reason: 'item.related',
        itemId: currentItemId,
        actorUserId: currentUserId,
      });
    }
  }
}
