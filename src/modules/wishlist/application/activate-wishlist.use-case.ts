import type { WishlistRepository } from '../domain/ports/wishlist.repository';
import type { Wishlist } from '../domain/wishlist.entity';
import { WishlistEntity } from '../domain/wishlist.entity';
import { AppError } from '@/common/middlewares/error.middleware';

export class ActivateWishlistUseCase {
  constructor(private wishlistRepo: WishlistRepository) {}

  async execute(listId: string): Promise<Wishlist> {
    const wishlist = await this.wishlistRepo.findById(listId);
    if (!wishlist) {
      throw new AppError('Wishlist not found', 404, 'NOT_FOUND');
    }

    const entity = WishlistEntity.from(wishlist);
    if (entity.isExpired()) {
      await this.wishlistRepo.updateExpiresAt(listId, null);
    }

    await this.wishlistRepo.updateActive(listId, true);

    const updated = await this.wishlistRepo.findById(listId);
    if (!updated) {
      throw new AppError('Wishlist not found', 404, 'NOT_FOUND');
    }
    return updated;
  }
}
