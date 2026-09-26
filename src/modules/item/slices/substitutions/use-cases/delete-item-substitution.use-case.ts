import type { ItemRepository } from '../../../domain/ports/item.repository';
import type { WishlistRepository } from '@/modules/wishlist';
import type { ListShareRepository } from '@/modules/wishlist';
import type { NotifyClaimersItemRemovedUseCase } from '../../claims/use-cases/notify-claimers-item-removed.use-case';
import { AppError } from '@/common/domain/errors/app-error';
import { assertWishlistMutable } from '@/modules/wishlist';
import type { ListChangedPublisher } from '@/modules/wishlist';
import { actorCanManageListItems } from '../utils/actor-can-manage-list-items.util';

export class DeleteItemSubstitutionUseCase {
  constructor(
    private itemRepo: ItemRepository,
    private wishlistRepo: WishlistRepository,
    private notifyClaimersItemRemoved: NotifyClaimersItemRemovedUseCase | undefined,
    private listShareRepo: ListShareRepository | undefined,
    private listChanged: ListChangedPublisher
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

    const canManage = await actorCanManageListItems(
      wishlist.UserId,
      wishlist.Id,
      actorUserId,
      this.listShareRepo
    );
    const isCreator = row.CreatedByUserId === actorUserId;
    if (!canManage && !isCreator) {
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

    this.listChanged.publish(parent.ListId, {
      reason: 'item.substitution',
      itemId: parent.Id,
      actorUserId: actorUserId,
    });
  }
}
