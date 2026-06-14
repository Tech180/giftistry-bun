import type { WishlistRepository } from '../domain/ports/wishlist.repository';
import type { Wishlist } from '../domain/wishlist.entity';

export class ListWishlistsUseCase {
  constructor(private wishlistRepo: WishlistRepository) {}

  async execute(userId: string): Promise<Wishlist[]> {
    return await this.wishlistRepo.findByUserId(userId);
  }
}
