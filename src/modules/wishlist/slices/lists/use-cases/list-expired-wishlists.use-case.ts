import type { WishlistRepository } from '../../../domain/ports/wishlist.repository';
import type { Wishlist } from '../../../domain/interfaces/wishlist.interface';

export class ListExpiredWishlistsUseCase {
  constructor(private wishlistRepo: WishlistRepository) {}

  async execute(): Promise<Wishlist[]> {
    return await this.wishlistRepo.findExpiredActive();
  }
}
