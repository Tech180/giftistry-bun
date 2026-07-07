import type { WishlistRepository } from '../domain/ports/wishlist.repository';
import type { Wishlist } from '../domain/wishlist.entity';
import { AppError } from '@/common/middlewares/error.middleware';
import { assertCanCreateWishlist } from '@/common/services/user-policy.service';

export class CreateWishlistUseCase {
  constructor(private wishlistRepo: WishlistRepository) {}

  async execute(userId: string, title: string, expiresAtStr?: string | null, allowGroupFunds: boolean = false, category?: string, revealSuggestions: boolean = true, aiEnabled: boolean = false): Promise<Wishlist> {
    if (!title) {
      throw new AppError('Wishlist title is required', 400, 'BAD_REQUEST');
    }

    await assertCanCreateWishlist(userId);

    if (aiEnabled) {
      const { assertUserCan } = await import('@/common/services/user-policy.service');
      await assertUserCan(userId, 'canUseAiFeatures');
    }

    let expiresAt: Date | null = null;
    if (expiresAtStr) {
      expiresAt = new Date(expiresAtStr);
      if (isNaN(expiresAt.getTime())) {
        throw new AppError('Invalid expiration date format', 400, 'BAD_REQUEST');
      }
    }

    return await this.wishlistRepo.create(userId, title, expiresAt, allowGroupFunds, category, revealSuggestions, aiEnabled);
  }
}
