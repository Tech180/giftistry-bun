import type { ItemRepository } from '../domain/ports/item.repository';
import type { WishlistRepository } from '@/modules/wishlist/domain/ports/wishlist.repository';
import { AppError } from '@/common/middlewares/error.middleware';
import type { ListChangedPublisher } from '@/modules/wishlist/domain/ports/list-changed-publisher.port';
import { assertLinkGroupSupportsLinkedItems } from '../domain/item-supports-linked-items.util';
import {
  getForwardLinkedIds,
  resolveLinkGroupMemberIds,
} from '../domain/resolve-item-link-group.util';
import type { Item } from '../domain/item.entity';

export class SyncItemLinksUseCase {
  constructor(
    private itemRepo: ItemRepository,
    private wishlistRepo: WishlistRepository,
    private listChanged: ListChangedPublisher
  ) {}

  async execute(currentItemId: string, targetItemIds: string[], currentUserId: string): Promise<void> {
    const currentItem = await this.itemRepo.findById(currentItemId);
    if (!currentItem) {
      throw new AppError('Item not found', 404, 'NOT_FOUND');
    }

    const wishlist = await this.wishlistRepo.findById(currentItem.ListId);
    if (!wishlist) {
      throw new AppError('Wishlist not found', 404, 'NOT_FOUND');
    }

    const wishlistItems = await this.itemRepo.findByListId(currentItem.ListId);

    const getLinkedItemIds = (itemId: string): string[] => {
      const item = wishlistItems.find((i) => i.Id === itemId);
      if (!item) return [];
      return getForwardLinkedIds(item);
    };

    const newGroup = new Set([currentItemId, ...targetItemIds]);
    const oldGroupIds = resolveLinkGroupMemberIds(currentItemId, wishlistItems);
    const oldGroup = new Set([currentItemId, ...oldGroupIds]);

    // Allow clearing links (group size 1) even for suggestions; block forming a group.
    if (newGroup.size > 1) {
      const groupItems = [...newGroup]
        .map((id) => wishlistItems.find((i) => i.Id === id))
        .filter((item): item is Item => !!item);
      assertLinkGroupSupportsLinkedItems(groupItems, wishlist.UserId);
    }

    const itemsToUpdate = new Set<string>([...oldGroup, ...newGroup]);
    let didChange = false;

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
      didChange = true;
    }

    if (didChange) {
      this.listChanged.publish(currentItem.ListId, {
        reason: 'item.links',
        itemId: currentItemId,
        actorUserId: currentUserId,
      });
    }
  }
}
