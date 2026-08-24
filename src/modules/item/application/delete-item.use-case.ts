import type { ItemRepository } from '../domain/ports/item.repository';
import type { AssertItemVisibleUseCase } from './assert-item-visible.use-case';
import { AppError } from '@/common/middlewares/error.middleware';
import { canUserMutateItem } from '../domain/item-visibility.service';
import { assertWishlistMutable } from '@/modules/wishlist/domain/assert-wishlist-mutable.util';
import { publishListChanged } from '@/modules/wishlist/infrastructure/wishlist-list-publisher';

export class DeleteItemUseCase {
  constructor(
    private itemRepo: ItemRepository,
    private assertItemVisible: AssertItemVisibleUseCase
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

    await this.itemRepo.delete(itemId);
    publishListChanged(visible.wishlist.Id, {
      reason: 'item.deleted',
      itemId,
      actorUserId: currentUserId,
    });
  }
}
