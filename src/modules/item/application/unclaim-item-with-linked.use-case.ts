import type { ItemRepository } from '../domain/ports/item.repository';
import type { AssertItemVisibleUseCase } from './assert-item-visible.use-case';
import type { UnclaimItemUseCase } from './unclaim-item.use-case';
import { AppError } from '@/common/middlewares/error.middleware';
import { assertWishlistMutable } from '@/modules/wishlist/domain/assert-wishlist-mutable.util';
import type { ListChangedPublisher } from '@/modules/wishlist/domain/ports/list-changed-publisher.port';
import { resolveLinkGroupItemIds } from '../domain/resolve-link-group-item-ids.util';

export class UnclaimItemWithLinkedUseCase {
  constructor(
    private itemRepo: ItemRepository,
    private assertItemVisible: AssertItemVisibleUseCase,
    private unclaimItem: UnclaimItemUseCase,
    private listChanged: ListChangedPublisher
  ) {}

  /**
   * Unclaims the primary item. When `includeLinked` is true, also unclaims the
   * current user's claims on every other item in the same bidirectional link group.
   * Returns item IDs that need claim projections refreshed.
   */
  async execute(
    itemId: string,
    userId: string,
    includeLinked: boolean
  ): Promise<string[]> {
    if (!includeLinked) {
      await this.unclaimItem.execute(itemId, userId);
      return [itemId];
    }

    if (!itemId) {
      throw new AppError('Item ID is required', 400, 'BAD_REQUEST');
    }
    if (!userId) {
      throw new AppError('User ID is required', 400, 'BAD_REQUEST');
    }

    const visible = await this.assertItemVisible.execute(itemId, userId);
    assertWishlistMutable(visible.wishlist);

    const item = await this.itemRepo.findById(itemId);
    if (!item) {
      throw new AppError('Item not found', 404, 'NOT_FOUND');
    }

    const primaryClaims = await this.itemRepo.findClaimsByItemId(itemId);
    const primaryUserClaim = primaryClaims.find((c) => c.UserId === userId);
    if (!primaryUserClaim) {
      throw new AppError('Claim not found for this user', 404, 'NOT_FOUND');
    }

    const linkMap = await this.itemRepo.findLinkedItemIdsByListId(item.ListId);
    const groupIds = resolveLinkGroupItemIds(itemId, linkMap);

    const toUnclaim: string[] = [];
    for (const groupItemId of groupIds) {
      const claims = await this.itemRepo.findClaimsByItemId(groupItemId);
      if (claims.some((c) => c.UserId === userId)) {
        toUnclaim.push(groupItemId);
      }
    }

    const affected = await this.itemRepo.deleteClaimsAtomic(toUnclaim, userId);
    this.listChanged.publish(item.ListId, {
      reason: 'claim.changed',
      itemId,
      actorUserId: userId,
    });
    return affected.length > 0 ? affected : [itemId];
  }
}
