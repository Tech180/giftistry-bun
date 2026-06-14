import type { WishlistRepository } from '../domain/ports/wishlist.repository';
import type { Priority } from '../domain/wishlist.entity';

export class ListPrioritiesUseCase {
  constructor(private wishlistRepo: WishlistRepository) {}

  async execute(userId: string): Promise<Priority[]> {
    return await this.wishlistRepo.findPrioritiesByUserId(userId);
  }
}
