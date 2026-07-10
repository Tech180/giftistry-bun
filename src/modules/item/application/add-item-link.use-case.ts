import type { ItemRepository } from '../domain/ports/item.repository';
import type { ItemLink } from '../domain/item.entity';
import type { AssertItemVisibleUseCase } from './assert-item-visible.use-case';
import { AppError } from '@/common/middlewares/error.middleware';
import type { EnrichLinkMetadataUseCase } from './enrich-link-metadata.use-case';
import type { ExtractItemReviewsUseCase } from './extract-item-reviews.use-case';

export class AddItemLinkUseCase {
  constructor(
    private itemRepo: ItemRepository,
    private assertItemVisible: AssertItemVisibleUseCase,
    private enrichLinkMetadata: EnrichLinkMetadataUseCase,
    private extractItemReviews: ExtractItemReviewsUseCase
  ) {}

  async execute(itemId: string, url: string, currentUserId: string): Promise<ItemLink> {
    if (!itemId) {
      throw new AppError('Item ID is required', 400, 'BAD_REQUEST');
    }
    if (!url) {
      throw new AppError('URL is required', 400, 'BAD_REQUEST');
    }

    await this.assertItemVisible.execute(itemId, currentUserId);

    const item = await this.itemRepo.findById(itemId);
    if (!item) {
      throw new AppError('Item not found', 404, 'NOT_FOUND');
    }

    let retailerName: string | null = null;
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      const retailerNameRaw = hostname.replace('www.', '').split('.')[0] || '';
      retailerName = retailerNameRaw ? retailerNameRaw.charAt(0).toUpperCase() + retailerNameRaw.slice(1) : null;
    } catch (e) {
      throw new AppError('Invalid URL format', 400, 'BAD_REQUEST');
    }

    const link = await this.itemRepo.createLink(
      itemId,
      url,
      retailerName,
      null,
      null
    );

    this.enrichLinkMetadata.execute(link.Id, url, null).catch((err) => {
      console.error('Background metadata enrichment failed:', err);
    });

    this.extractItemReviews.execute(itemId, item.ListId, url).catch((err) => {
      console.error('Background AI review extraction trigger failed:', err);
    });

    return link;
  }
}
