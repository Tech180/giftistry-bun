import type { WishlistRepository } from '../../../domain/ports/wishlist.repository';
import type { UserRepository } from '@/modules/auth';
import type { Wishlist } from '../../../domain/interfaces/wishlist.interface';
import type { ServerConfigRepository } from '@/modules/system';
import { AppError } from '@/common/domain/errors/app-error';
import type { ListReviewBackfillPort } from '@/modules/item';
import type { AssertUserCanUseCase } from '@/common/application/use-cases/user-policy.use-cases';
import { assertOwnerCanEnableListAi } from '@/common/application/utils/user-ai-access.util';
import { assertOwnerCanEnableListWebSearch } from '@/common/application/utils/user-web-search-access.util';
import type { ListChangedPublisher } from '../../../domain/ports/list-changed-publisher.port';

export class UpdateWishlistUseCase {
  constructor(
    private wishlistRepo: WishlistRepository,
    private userRepo: UserRepository,
    private assertUserCan: AssertUserCanUseCase,
    private backfillListReviews: ListReviewBackfillPort,
    private configRepo: ServerConfigRepository,
    private listChanged: ListChangedPublisher
  ) {}

  async execute(
    listId: string,
    title: string,
    expiresAtStr?: string | null,
    allowGroupFunds: boolean = false,
    category?: string,
    revealSuggestions?: boolean,
    aiEnabled?: boolean,
    webSearchEnabled?: boolean,
    manualJobBackground?: boolean,
    autoRollover?: boolean
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

    const updated = await this.wishlistRepo.update(
      listId,
      title,
      expiresAt,
      allowGroupFunds,
      category,
      revealSuggestions,
      aiEnabled,
      webSearchEnabled,
      manualJobBackground,
      autoRollover
    );

    this.listChanged.publish(listId, {
      reason: 'list.updated',
      actorUserId: existing.UserId,
    });

    return updated;
  }
}
