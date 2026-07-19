import type { ItemRepository } from '../domain/ports/item.repository';
import { AppError } from '@/common/middlewares/error.middleware';
import { resolveItemMetadata } from '../domain/resolve-item-metadata.util';

export class SyncItemLinksUseCase {
  constructor(private itemRepo: ItemRepository) {}

  async execute(currentItemId: string, targetItemIds: string[], currentUserId: string): Promise<void> {
    const currentItem = await this.itemRepo.findById(currentItemId);
    if (!currentItem) {
      throw new AppError('Item not found', 404, 'NOT_FOUND');
    }

    const wishlistItems = await this.itemRepo.findByListId(currentItem.ListId);

    const getLinkedItemIds = (itemId: string): string[] => {
      const item = wishlistItems.find((i) => i.Id === itemId);
      if (!item) return [];
      if (item.LinkedItemIds && item.LinkedItemIds.length > 0) {
        return item.LinkedItemIds;
      }
      return resolveItemMetadata(item)?.LinkedItemIds ?? [];
    };

    const newGroup = new Set([currentItemId, ...targetItemIds]);
    const oldGroupIds = getLinkedItemIds(currentItemId);
    const oldGroup = new Set([currentItemId, ...oldGroupIds]);

    const itemsToUpdate = new Set<string>([...oldGroup, ...newGroup]);

    for (const itemId of itemsToUpdate) {
      const item = wishlistItems.find((i) => i.Id === itemId);
      if (!item) continue;

      let targetLinks: string[];
      if (newGroup.has(itemId)) {
        targetLinks = [...newGroup].filter((id) => id !== itemId);
      } else {
        const existing = getLinkedItemIds(itemId);
        targetLinks = existing.filter((id) => !oldGroup.has(id));
      }

      const existing = getLinkedItemIds(itemId);
      const unchanged =
        existing.length === targetLinks.length &&
        existing.every((id) => targetLinks.includes(id));

      if (unchanged) continue;

      await this.itemRepo.replaceLinkedItemIds(itemId, targetLinks);
      item.LinkedItemIds = targetLinks;
    }
  }
}
