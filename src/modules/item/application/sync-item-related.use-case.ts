import type { ItemRepository } from '../domain/ports/item.repository';
import { AppError } from '@/common/middlewares/error.middleware';
import { resolveItemMetadata } from '../domain/resolve-item-metadata.util';

export class SyncItemRelatedUseCase {
  constructor(private itemRepo: ItemRepository) {}

  async execute(currentItemId: string, targetItemIds: string[], currentUserId: string): Promise<void> {
    const currentItem = await this.itemRepo.findById(currentItemId);
    if (!currentItem) {
      throw new AppError('Item not found', 404, 'NOT_FOUND');
    }

    const wishlistItems = await this.itemRepo.findByListId(currentItem.ListId);

    const getRelatedItemIds = (itemId: string): string[] => {
      const item = wishlistItems.find((i) => i.Id === itemId);
      if (!item) return [];
      if (item.RelatedItemIds && item.RelatedItemIds.length > 0) {
        return item.RelatedItemIds;
      }
      return resolveItemMetadata(item)?.RelatedItemIds ?? [];
    };

    const newGroup = new Set([currentItemId, ...targetItemIds]);
    const oldGroupIds = getRelatedItemIds(currentItemId);
    const oldGroup = new Set([currentItemId, ...oldGroupIds]);

    const itemsToUpdate = new Set<string>([...oldGroup, ...newGroup]);

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
    }
  }
}
