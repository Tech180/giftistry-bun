import type { ItemReviewRepository } from '../domain/ports/item-review.repository';
import type { ExtractItemReviewsUseCase } from './extract-item-reviews.use-case';
import type { ServerConfigRepository } from '@/modules/system/domain/ports/server-config.repository';

export class BackfillListReviewsUseCase {
  constructor(
    private itemReviewRepo: ItemReviewRepository,
    private extractItemReviews: ExtractItemReviewsUseCase,
    private configRepo: ServerConfigRepository
  ) {}

  async execute(listId: string): Promise<void> {
    try {
      const config = this.configRepo.load();
      if (!config.AiEnabled) return;

      const itemsToBackfill = await this.itemReviewRepo.findItemsNeedingBackfill(listId);
      if (itemsToBackfill.length === 0) return;

      console.log(
        `[AI Review] Backfilling reviews for ${itemsToBackfill.length} items in list ${listId}`
      );

      for (const item of itemsToBackfill) {
        this.extractItemReviews.execute(item.itemId, listId, item.url).catch(err => {
          console.error(`[AI Review] Failed to backfill review for item ${item.itemId}:`, err);
        });
      }
    } catch (err) {
      console.error('[AI Review] Backfill operation failed:', err);
    }
  }
}
