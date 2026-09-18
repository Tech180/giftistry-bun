import type { ItemRepository } from '../domain/ports/item.repository';
import type { WishlistRepository } from '@/modules/wishlist/domain/ports/wishlist.repository';
import type { ListShareRepository } from '@/modules/wishlist/domain/ports/list-share.repository';
import { AppError } from '@/common/middlewares/error.middleware';
import { assertWishlistMutable } from '@/modules/wishlist/domain/assert-wishlist-mutable.util';
import { publishListChanged } from '@/modules/wishlist/infrastructure/wishlist-list-publisher';
import { actorCanManageListItems } from './create-owner-substitution.use-case';

export class ReorderOwnerSubstitutionsUseCase {
  constructor(
    private itemRepo: ItemRepository,
    private wishlistRepo: WishlistRepository,
    private listShareRepo?: ListShareRepository
  ) {}

  async execute(
    parentItemId: string,
    actorUserId: string,
    orderedIds: string[]
  ): Promise<void> {
    const parent = await this.itemRepo.findById(parentItemId);
    if (!parent) {
      throw new AppError('Item not found', 404, 'NOT_FOUND');
    }

    const wishlist = await this.wishlistRepo.findById(parent.ListId);
    if (!wishlist) {
      throw new AppError('Wishlist not found', 404, 'NOT_FOUND');
    }
    assertWishlistMutable(wishlist);

    const canManage = await actorCanManageListItems(
      wishlist.UserId,
      wishlist.Id,
      actorUserId,
      this.listShareRepo
    );
    if (!canManage) {
      throw new AppError('Only list editors can reorder substitutions', 403, 'FORBIDDEN');
    }

    const existing = await this.itemRepo.findSubstitutionsByParentId(parentItemId);
    const ownerIds = existing
      .filter((r) => r.Kind === 'owner_approved')
      .map((r) => r.Id);

    if (
      orderedIds.length !== ownerIds.length ||
      !orderedIds.every((id) => ownerIds.includes(id))
    ) {
      throw new AppError(
        'Ordered IDs must match all owner-approved substitutions',
        400,
        'BAD_REQUEST'
      );
    }

    await this.itemRepo.updateSubstitutionSortOrders(parentItemId, orderedIds);

    publishListChanged(parent.ListId, {
      reason: 'item.substitution',
      itemId: parentItemId,
      actorUserId: actorUserId,
    });
  }
}
