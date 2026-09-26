import type { ItemRepository } from '../../../domain/ports/item.repository';
import type { AssertItemVisibleUseCase } from './assert-item-visible.use-case';
import type { NotifyClaimersItemRemovedUseCase } from '../../claims/use-cases/notify-claimers-item-removed.use-case';
import { AppError } from '@/common/domain/errors/app-error';
import { canUserMutateItem } from '../../../domain/utils/item-visibility.util';
import { assertWishlistMutable } from '@/modules/wishlist';
import type { ListChangedPublisher } from '@/modules/wishlist';

export class DeleteItemUseCase {
  constructor(
    private itemRepo: ItemRepository,
    private assertItemVisible: AssertItemVisibleUseCase,
    private notifyClaimersItemRemoved: NotifyClaimersItemRemovedUseCase | undefined,
    private listChanged: ListChangedPublisher
  ) {}

  async execute(itemId: string, currentUserId: string): Promise<void> {
    if (!itemId) {
      throw new AppError('Item ID is required', 400, 'BAD_REQUEST');
    }

    const visible = await this.assertItemVisible.execute(itemId, currentUserId);
    assertWishlistMutable(visible.wishlist);
    if (!canUserMutateItem({ ...visible, currentUserId })) {
      throw new AppError('Forbidden', 403, 'FORBIDDEN');
    }

    if (this.notifyClaimersItemRemoved) {
      const listTitle = visible.wishlist.Title?.trim() || 'a wishlist';
      const listId = visible.wishlist.Id;
      const ownerId = visible.wishlist.UserId;

      const notifyForItem = async (targetItemId: string, itemName: string) => {
        const claims = await this.itemRepo.findClaimsByItemId(targetItemId);
        await this.notifyClaimersItemRemoved!.execute({
          claims,
          itemName,
          listId,
          listTitle,
          excludeUserId: ownerId,
        });
      };

      await notifyForItem(itemId, visible.item.Name);

      if (!visible.item.IsSubstitution) {
        const subRows = await this.itemRepo.findSubstitutionsByParentId(itemId);
        for (const row of subRows) {
          const child = await this.itemRepo.findById(row.SubstitutionItemId);
          if (!child) continue;
          await notifyForItem(child.Id, child.Name);
        }
      }
    }

    await this.itemRepo.delete(itemId);
    this.listChanged.publish(visible.wishlist.Id, {
      reason: 'item.deleted',
      itemId,
      actorUserId: currentUserId,
    });
  }
}
