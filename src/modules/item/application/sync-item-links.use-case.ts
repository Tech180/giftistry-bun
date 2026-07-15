import type { ItemRepository } from '../domain/ports/item.repository';
import { parseItemDescription, serializeItemDescription } from '../domain/item-description.util';
import { AppError } from '@/common/middlewares/error.middleware';

export class SyncItemLinksUseCase {
  constructor(private itemRepo: ItemRepository) {}

  async execute(currentItemId: string, targetItemIds: string[], currentUserId: string): Promise<void> {
    const currentItem = await this.itemRepo.findById(currentItemId);
    if (!currentItem) {
      throw new AppError('Item not found', 404, 'NOT_FOUND');
    }

    // Fetch all items in the same wishlist to have the full context
    const wishlistItems = await this.itemRepo.findByListId(currentItem.ListId);

    const getLinkedItemIds = (itemDescription: string | null | undefined): string[] => {
      const { metadata } = parseItemDescription(itemDescription);
      return metadata?.LinkedItemIds ?? [];
    };

    const newGroup = new Set([currentItemId, ...targetItemIds]);
    const oldGroupIds = getLinkedItemIds(currentItem.Description);
    const oldGroup = new Set([currentItemId, ...oldGroupIds]);

    const itemsToUpdate = new Set<string>([...oldGroup, ...newGroup]);

    for (const itemId of itemsToUpdate) {
      const item = wishlistItems.find((i) => i.Id === itemId);
      if (!item) continue;

      let targetLinks: string[];
      if (newGroup.has(itemId)) {
        targetLinks = [...newGroup].filter((id) => id !== itemId);
      } else {
        const existing = getLinkedItemIds(item.Description);
        targetLinks = existing.filter((id) => !oldGroup.has(id));
      }

      const existing = getLinkedItemIds(item.Description);
      const unchanged =
        existing.length === targetLinks.length &&
        existing.every((id) => targetLinks.includes(id));

      if (unchanged) continue;

      const parsed = parseItemDescription(item.Description);
      const metadata = { ...(parsed.metadata ?? {}) };

      if (targetLinks.length > 0) {
        metadata.LinkedItemIds = targetLinks;
      } else {
        delete metadata.LinkedItemIds;
      }

      const hasMetadataBeyondLinks = (meta: typeof metadata): boolean => {
        return Object.entries(meta).some(([key, value]) => {
          if (key === 'LinkedItemIds' || key === 'Text') return false;
          if (value === null || value === undefined || value === '') return false;
          if (Array.isArray(value) && value.length === 0) return false;
          if (key === 'CustomFields') {
            const fields = value as typeof metadata['CustomFields'];
            const hasPredefined = Object.values(fields?.Predefined ?? {}).some(
              (entry) => entry != null && String(entry).trim()
            );
            const hasUserDefined = Object.values(fields?.UserDefined ?? {}).some((entry) => entry.trim());
            return hasPredefined || hasUserDefined;
          }
          if (value === false) return false;
          return true;
        });
      };

      let updatedDescription: string | null = null;
      if (!parsed.isJson && targetLinks.length === 0) {
        updatedDescription = item.Description;
      } else if (targetLinks.length === 0 && !hasMetadataBeyondLinks(metadata) && !parsed.text) {
        updatedDescription = null;
      } else if (targetLinks.length === 0 && !hasMetadataBeyondLinks(metadata) && parsed.text) {
        updatedDescription = parsed.text;
      } else {
        updatedDescription = serializeItemDescription(parsed.text, metadata);
      }

      await this.itemRepo.update(
        item.Id,
        item.Name,
        updatedDescription,
        item.PriorityId,
        item.Category,
        item.Priority
      );
    }
  }
}
