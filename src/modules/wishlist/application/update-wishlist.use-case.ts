import type { WishlistRepository } from '../domain/ports/wishlist.repository';
import type { UserRepository } from '@/modules/auth/domain/ports/user.repository';
import type { Wishlist } from '../domain/wishlist.entity';
import type { ServerConfigRepository } from '@/modules/system/domain/ports/server-config.repository';
import { AppError } from '@/common/middlewares/error.middleware';
import type { BackfillListReviewsUseCase } from '@/modules/item/application/backfill-list-reviews.use-case';
import type { AssertUserCanUseCase } from '@/common/application/user-policy.use-cases';
import { assertOwnerCanEnableListAi } from '@/common/application/user-ai-access.util';
import { assertOwnerCanEnableListWebSearch } from '@/common/application/user-web-search-access.util';

export class UpdateWishlistUseCase {
  constructor(
    private wishlistRepo: WishlistRepository,
    private userRepo: UserRepository,
    private assertUserCan: AssertUserCanUseCase,
    private backfillListReviews: BackfillListReviewsUseCase,
    private configRepo: ServerConfigRepository
  ) {}

  async execute(
    listId: string,
    title: string,
    expiresAtStr?: string | null,
    allowGroupFunds: boolean = false,
    category?: string,
    revealSuggestions?: boolean,
    aiEnabled?: boolean,
    webSearchEnabled?: boolean
  ): Promise<Wishlist> {
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
      await assertOwnerCanEnableListAi(existing.UserId, this.userRepo, this.assertUserCan);
      this.backfillListReviews.execute(listId).catch(err => {
        console.error('[AI Review] Failed to trigger backfill on wishlist update:', err);
      });
    }

    if (webSearchEnabled && !existing.WebSearchEnabled) {
      await assertOwnerCanEnableListWebSearch(
        existing.UserId,
        this.userRepo,
        this.assertUserCan,
        this.configRepo.load()
      );
    }

    return await this.wishlistRepo.update(
      listId,
      title,
      expiresAt,
      allowGroupFunds,
      category,
      revealSuggestions,
      aiEnabled,
      webSearchEnabled
    );
  }
}
