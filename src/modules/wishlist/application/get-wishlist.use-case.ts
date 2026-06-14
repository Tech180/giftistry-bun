import type { WishlistRepository } from '../domain/ports/wishlist.repository';
import type { Wishlist } from '../domain/wishlist.entity';
import { AppError } from '@/common/middlewares/error.middleware';

export class GetWishlistUseCase {
  constructor(private wishlistRepo: WishlistRepository) {}

  async execute(listId: string): Promise<Wishlist> {
    const wishlist = await this.wishlistRepo.findById(listId);
    if (!wishlist) {
      throw new AppError('Wishlist not found', 404, 'NOT_FOUND');
    }
    return wishlist;
  }
}
