import type { ItemRepository } from '../../../domain/ports/item.repository';
import type { AssertItemVisibleUseCase } from '../../catalog/use-cases/assert-item-visible.use-case';
import { AppError } from '@/common/domain/errors/app-error';
import { assertWishlistMutable } from '@/modules/wishlist';
import type { ListChangedPublisher } from '@/modules/wishlist';

export class UnclaimItemUseCase {
  constructor(
    private itemRepo: ItemRepository,
    private assertItemVisible: AssertItemVisibleUseCase,
    private listChanged: ListChangedPublisher
  ) {}

  async execute(itemId: string, userId: string): Promise<void> {
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

    const claims = await this.itemRepo.findClaimsByItemId(itemId);
    const userClaim = claims.find(c => c.UserId === userId);
    if (!userClaim) {
      throw new AppError('Claim not found for this user', 404, 'NOT_FOUND');
    }

    await this.itemRepo.deleteClaim(itemId, userId);
    this.listChanged.publish(item.ListId, {
      reason: 'claim.changed',
      itemId,
      actorUserId: userId,
    });
  }
}
