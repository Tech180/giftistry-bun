import type { WishlistRepository } from '../domain/ports/wishlist.repository';
import type { Priority } from '../domain/wishlist.entity';

export class ListPrioritiesUseCase {
  constructor(private wishlistRepo: WishlistRepository) {}

  async execute(userId: string, wishlistId?: string): Promise<Priority[]> {
    if (!wishlistId) {
      return await this.wishlistRepo.findPrioritiesByUserId(userId);
    }
    const wishlist = await this.wishlistRepo.findById(wishlistId);
    if (!wishlist) {
      return await this.wishlistRepo.findPrioritiesByUserId(userId);
    }
    const isOwner = wishlist.UserId === userId;
    const hasExpired = wishlist.ExpiresAt ? new Date() > new Date(wishlist.ExpiresAt) : false;
    const revealSuggestions = wishlist.RevealSuggestions ?? false;
    return await this.wishlistRepo.findPrioritiesByWishlistForUser(
      wishlistId,
      userId,
      isOwner,
      hasExpired,
      revealSuggestions
    );
  }
}
