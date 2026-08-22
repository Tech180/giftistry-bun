import type { WishlistRepository } from '../domain/ports/wishlist.repository';
import type { Wishlist } from '../domain/wishlist.entity';
import { WishlistEntity } from '../domain/wishlist.entity';
import { AppError } from '@/common/middlewares/error.middleware';
import type { RolloverWishlistUseCase } from './rollover-wishlist.use-case';

export class GetWishlistUseCase {
  constructor(
    private wishlistRepo: WishlistRepository,
    private rolloverWishlist: RolloverWishlistUseCase
  ) {}

  async execute(listId: string): Promise<Wishlist> {
    const wishlist = await this.wishlistRepo.findById(listId);
    if (!wishlist) {
      throw new AppError('Wishlist not found', 404, 'NOT_FOUND');
    }

    const entity = WishlistEntity.from(wishlist);
    if (entity.IsActive && entity.isExpired()) {
      if (entity.AutoRollover === true) {
        return await this.rolloverWishlist.execute(listId);
      }

      await this.wishlistRepo.updateActive(listId, false);
      return {
        ...wishlist,
        IsActive: false,
      };
    }

    return wishlist;
  }
}
