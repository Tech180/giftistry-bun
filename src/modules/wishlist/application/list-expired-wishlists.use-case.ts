import type { WishlistRepository } from '../domain/ports/wishlist.repository';
import type { Wishlist } from '../domain/wishlist.entity';

export class ListExpiredWishlistsUseCase {
  constructor(private wishlistRepo: WishlistRepository) {}

  async execute(): Promise<Wishlist[]> {
    return await this.wishlistRepo.findExpiredActive();
  }
}
