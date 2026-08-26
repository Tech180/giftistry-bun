import type { ItemRepository } from '../domain/ports/item.repository';
import type { WishlistRepository } from '@/modules/wishlist/domain/ports/wishlist.repository';
import type { NotifyClaimersItemRemovedUseCase } from './notify-claimers-item-removed.use-case';
import { AppError } from '@/common/middlewares/error.middleware';
import { assertWishlistMutable } from '@/modules/wishlist/domain/assert-wishlist-mutable.util';
import { publishListChanged } from '@/modules/wishlist/infrastructure/wishlist-list-publisher';

export class DeleteItemSubstitutionUseCase {
  constructor(
    private itemRepo: ItemRepository,
    private wishlistRepo: WishlistRepository,
    private notifyClaimersItemRemoved?: NotifyClaimersItemRemovedUseCase
  ) {}

  async execute(substitutionId: string, actorUserId: string): Promise<void> {
    const row = await this.itemRepo.findSubstitutionById(substitutionId);
    if (!row) {
      throw new AppError('Substitution not found', 404, 'NOT_FOUND');
    }

    const parent = await this.itemRepo.findById(row.ParentItemId);
    if (!parent) {
      throw new AppError('Parent item not found', 404, 'NOT_FOUND');
    }

    const wishlist = await this.wishlistRepo.findById(parent.ListId);
    if (!wishlist) {
      throw new AppError('Wishlist not found', 404, 'NOT_FOUND');
    }
    assertWishlistMutable(wishlist);

    const isOwner = wishlist.UserId === actorUserId;
    const isCreator = row.CreatedByUserId === actorUserId;
    if (!isOwner && !isCreator) {
      throw new AppError('Forbidden', 403, 'FORBIDDEN');
    }

    if (this.notifyClaimersItemRemoved) {
      const child = await this.itemRepo.findById(row.SubstitutionItemId);
      if (child) {
        const claims = await this.itemRepo.findClaimsByItemId(child.Id);
        await this.notifyClaimersItemRemoved.execute({
          claims,
          itemName: child.Name,
          listId: wishlist.Id,
          listTitle: wishlist.Title?.trim() || 'a wishlist',
          excludeUserId: wishlist.UserId,
        });
      }
    }

    await this.itemRepo.deleteSubstitution(substitutionId);

    publishListChanged(parent.ListId, {
      reason: 'item.substitution',
      itemId: parent.Id,
      actorUserId: actorUserId,
    });
  }
}
