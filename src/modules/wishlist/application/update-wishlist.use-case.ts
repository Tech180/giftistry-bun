import type { WishlistRepository } from '../domain/ports/wishlist.repository';
import type { Wishlist } from '../domain/wishlist.entity';
import { AppError } from '@/common/middlewares/error.middleware';
import { AIReviewService } from '@/common/services/ai-review.service';

export class UpdateWishlistUseCase {
  constructor(private wishlistRepo: WishlistRepository) {}

  async execute(listId: string, title: string, expiresAtStr?: string | null, allowGroupFunds: boolean = false, category?: string, revealSuggestions?: boolean, aiEnabled?: boolean): Promise<Wishlist> {
    if (!title) {
      throw new AppError('Wishlist title is required', 400, 'BAD_REQUEST');
    }

    const existing = await this.wishlistRepo.findById(listId);
    if (!existing) {
      throw new AppError('Wishlist not found', 404, 'NOT_FOUND');
    }

    let expiresAt: Date | null = null;
    if (expiresAtStr) {
      expiresAt = new Date(expiresAtStr);
      if (isNaN(expiresAt.getTime())) {
        throw new AppError('Invalid expiration date format', 400, 'BAD_REQUEST');
      }
    }

    if (aiEnabled && !existing.AiEnabled) {
      AIReviewService.backfillListReviews(listId).catch(err => {
        console.error('[AI Review] Failed to trigger backfill on wishlist update:', err);
      });
    }

    return await this.wishlistRepo.update(listId, title, expiresAt, allowGroupFunds, category, revealSuggestions, aiEnabled);
  }
}
