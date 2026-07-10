import type { ItemRepository } from '../domain/ports/item.repository';
import type { ItemReviewRepository } from '../domain/ports/item-review.repository';
import type { ReviewExtractor } from '../domain/ports/review-extractor.port';
import type { WishlistRepository } from '@/modules/wishlist/domain/ports/wishlist.repository';
import { loadConfig } from '@/common/infrastructure/config.loader';

export class ExtractItemReviewsUseCase {
  constructor(
    private itemReviewRepo: ItemReviewRepository,
    private reviewExtractor: ReviewExtractor,
    private itemRepo: ItemRepository,
    private wishlistRepo: WishlistRepository
  ) {}

  async execute(itemId: string, listId: string, url: string): Promise<void> {
    try {
      const config = loadConfig();
      if (!config.aiEnabled) {
        console.log('[AI Review] Global AI features are disabled. Skipping extraction.');
        return;
      }

      const wishlist = await this.wishlistRepo.findById(listId);
      if (!wishlist || !wishlist.AiEnabled) {
        console.log(`[AI Review] AI features are disabled for list ${listId}. Skipping extraction.`);
        return;
      }

      if (await this.itemReviewRepo.exists(itemId)) {
        console.log(`[AI Review] Reviews already exist for item ${itemId}. Skipping extraction.`);
        return;
      }

      const item = await this.itemRepo.findById(itemId);
      if (!item) {
        console.log(`[AI Review] Item ${itemId} not found. Skipping extraction.`);
        return;
      }

      console.log(`[AI Review] Triggering review extraction for item: "${item.Name}" (${url})`);

      const provider = config.aiProvider || 'gemini';
      const apiKey = config.aiApiKey || Bun.env.GEMINI_API_KEY || '';
      const model = config.aiModel || '';
      const customPrompt = config.aiPrompt || '';
      const endpoint = config.aiEndpoint || '';

      const reviewData = await this.reviewExtractor.extract(
        {
          itemName: item.Name,
          category: item.Category,
          url,
        },
        {
          provider,
          apiKey,
          model,
          customPrompt,
          endpoint,
        }
      );

      await this.itemReviewRepo.save(itemId, reviewData);
      console.log(`[AI Review] Successfully saved reviews for item: "${item.Name}"`);
    } catch (err) {
      console.error('[AI Review] Failed to extract and save reviews:', err);
    }
  }
}
