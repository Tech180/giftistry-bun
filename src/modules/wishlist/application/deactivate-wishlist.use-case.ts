import type { WishlistRepository } from '../domain/ports/wishlist.repository';
import { AppError } from '@/common/middlewares/error.middleware';

export class DeactivateWishlistUseCase {
  constructor(private wishlistRepo: WishlistRepository) {}

  async execute(listId: string): Promise<void> {
    const wishlist = await this.wishlistRepo.findById(listId);
    if (!wishlist) {
      throw new AppError('Wishlist not found', 404, 'NOT_FOUND');
    }
    await this.wishlistRepo.updateActive(listId, false);
  }
}
