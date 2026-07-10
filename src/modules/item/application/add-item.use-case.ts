import type { ItemRepository } from '../domain/ports/item.repository';
import type { ItemAudienceRepository } from '../domain/ports/item-audience.repository';
import type { Item } from '../domain/item.entity';
import { AppError } from '@/common/middlewares/error.middleware';
import type { EnrichLinkMetadataUseCase } from './enrich-link-metadata.use-case';
import type { ExtractItemReviewsUseCase } from './extract-item-reviews.use-case';

export class AddItemUseCase {
  constructor(
    private itemRepo: ItemRepository,
    private audienceRepo: ItemAudienceRepository,
    private enrichLinkMetadata: EnrichLinkMetadataUseCase,
    private extractItemReviews: ExtractItemReviewsUseCase
  ) {}

  async execute(
    listId: string,
    name: string,
    description: string | null = null,
    priorityId: string | null = null,
    isHiddenIdea: boolean = false,
    suggestedByUserId: string | null = null,
    linkUrl: string | null = null,
    price: number | null = null,
    websiteName: string | null = null,
    category: string = 'uncategorized',
    isSuggestion: boolean = false,
    priority: number | null = null,
    sharedWithUserIds: string[] = []
  ): Promise<Item> {
    if (!listId) {
      throw new AppError('List ID is required', 400, 'BAD_REQUEST');
    }
    if (!name) {
      throw new AppError('Item name is required', 400, 'BAD_REQUEST');
    }

    let retailerName: string | null = websiteName || null;
    if (linkUrl && !retailerName) {
      try {
        const urlObj = new URL(linkUrl);
        const hostname = urlObj.hostname;
        const retailerNameRaw = hostname.replace('www.', '').split('.')[0] || '';
        retailerName = retailerNameRaw ? retailerNameRaw.charAt(0).toUpperCase() + retailerNameRaw.slice(1) : null;
      } catch (e) {
        throw new AppError('Invalid URL format', 400, 'BAD_REQUEST');
      }
    }

    const item = await this.itemRepo.create(listId, priorityId, suggestedByUserId, name, description, isHiddenIdea, category, isSuggestion, priority);

    const sharedWith = await this.audienceRepo.setAudience(item.Id, sharedWithUserIds);

    if (linkUrl) {
      const link = await this.itemRepo.createLink(
        item.Id,
        linkUrl,
        retailerName,
        price,
        null
      );

      this.enrichLinkMetadata.execute(link.Id, linkUrl, price).catch((err) => {
        console.error('Background metadata enrichment failed:', err);
      });

      this.extractItemReviews.execute(item.Id, listId, linkUrl).catch((err) => {
        console.error('Background AI review extraction trigger failed:', err);
      });
    }

    return {
      ...item,
      SharedWith: sharedWith.length > 0 ? sharedWith : undefined,
    };
  }
}
