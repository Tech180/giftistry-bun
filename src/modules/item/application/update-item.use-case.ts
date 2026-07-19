import type { ItemRepository } from '../domain/ports/item.repository';
import type { ItemAudienceRepository } from '../domain/ports/item-audience.repository';
import type { Item } from '../domain/item.entity';
import type { AssertItemVisibleUseCase } from './assert-item-visible.use-case';
import type { EnrichLinkMetadataUseCase } from './enrich-link-metadata.use-case';
import type { ExtractItemReviewsUseCase } from './extract-item-reviews.use-case';
import { AppError } from '@/common/middlewares/error.middleware';
import type { ItemDescriptionMetadata } from '../domain/item-description.util';
import { resolvePlainDescriptionText } from '../domain/resolve-item-metadata.util';
import type { ItemMetadataWrite } from '../domain/ports/item.repository';

function toMetadataWrite(
  metadata: ItemDescriptionMetadata | null | undefined
): ItemMetadataWrite | null {
  if (!metadata) return null;
  return {
    IsFavorite: metadata.IsFavorite === true,
    IsPinned: metadata.IsPinned === true,
    DesiredQuantity: metadata.DesiredQuantity ?? null,
    MultiCount: metadata.MultiCount === true,
    OtherUsersCanSee:
      metadata.OtherUsersCanSee === undefined ? null : metadata.OtherUsersCanSee,
    CustomFields: metadata.CustomFields ?? null,
    Variations: metadata.Variations ?? null,
  };
}

export class UpdateItemUseCase {
  constructor(
    private itemRepo: ItemRepository,
    private audienceRepo: ItemAudienceRepository,
    private assertItemVisible: AssertItemVisibleUseCase,
    private enrichLinkMetadata: EnrichLinkMetadataUseCase,
    private extractItemReviews: ExtractItemReviewsUseCase
  ) {}

  async execute(
    itemId: string,
    currentUserId: string,
    name: string,
    description: string | null = null,
    priorityId: string | null = null,
    category: string = 'uncategorized',
    priority: number | null = null,
    sharedWithUserIds?: string[] | null,
    linkUrl?: string | null,
    price?: number | null,
    websiteName?: string | null,
    metadata?: ItemDescriptionMetadata | null
  ): Promise<Item> {
    if (!itemId) {
      throw new AppError('Item ID is required', 400, 'BAD_REQUEST');
    }
    if (!name) {
      throw new AppError('Item name is required', 400, 'BAD_REQUEST');
    }

    await this.assertItemVisible.execute(itemId, currentUserId);

    const item = await this.itemRepo.findById(itemId);
    if (!item) {
      throw new AppError('Item not found', 404, 'NOT_FOUND');
    }

    let resolvedDescription = description;
    let metadataWrite: ItemMetadataWrite | null | undefined = undefined;
    if (metadata !== undefined) {
      if (metadata === null) {
        resolvedDescription = resolvePlainDescriptionText(description, null);
        metadataWrite = {
          IsFavorite: false,
          IsPinned: false,
          DesiredQuantity: null,
          MultiCount: false,
          OtherUsersCanSee: null,
          CustomFields: null,
          Variations: null,
        };
      } else {
        resolvedDescription = resolvePlainDescriptionText(description, metadata);
        metadataWrite = toMetadataWrite(metadata);
      }
    }

    const updated = await this.itemRepo.update(
      itemId,
      name,
      resolvedDescription,
      priorityId,
      category,
      priority,
      metadataWrite ?? null
    );

    if (metadata !== undefined) {
      const linkedIds = metadata?.LinkedItemIds ?? [];
      await this.itemRepo.replaceLinkedItemIds(itemId, linkedIds);
      updated.LinkedItemIds = linkedIds;
    }

    let sharedWith = await this.audienceRepo.findByItemId(itemId);
    if (sharedWithUserIds !== undefined) {
      sharedWith = await this.audienceRepo.setAudience(itemId, sharedWithUserIds ?? []);
    }

    if (linkUrl !== undefined) {
      await this.syncItemLink(item, linkUrl, price, websiteName ?? null);
    }

    return {
      ...updated,
      SharedWith: sharedWith.length > 0 ? sharedWith : undefined,
    };
  }

  private async syncItemLink(
    item: Item,
    linkUrl: string | null,
    price: number | null | undefined,
    websiteName: string | null
  ): Promise<void> {
    const existingLinks = await this.itemRepo.findLinksByItemId(item.Id);
    const normalizedUrl = linkUrl?.trim() || null;

    if (!normalizedUrl) {
      if (existingLinks.length > 0) {
        await this.itemRepo.deleteLinksByItemId(item.Id);
      }
      return;
    }

    let retailerName: string | null = websiteName || null;
    if (!retailerName) {
      try {
        const urlObj = new URL(normalizedUrl);
        const hostname = urlObj.hostname;
        const retailerNameRaw = hostname.replace('www.', '').split('.')[0] || '';
        retailerName = retailerNameRaw ? retailerNameRaw.charAt(0).toUpperCase() + retailerNameRaw.slice(1) : null;
      } catch {
        throw new AppError('Invalid URL format', 400, 'BAD_REQUEST');
      }
    }

    const existingLink = existingLinks[0];
    if (existingLink) {
      const urlChanged = existingLink.Url !== normalizedUrl;
      const resolvedPrice = price !== undefined ? price : existingLink.ExtractedPrice;
      await this.itemRepo.updateLink(
        existingLink.Id,
        normalizedUrl,
        retailerName,
        resolvedPrice,
        existingLink.ExtractedImageUrl
      );

      if (urlChanged) {
        this.enrichLinkMetadata.execute(existingLink.Id, normalizedUrl, resolvedPrice).catch((err) => {
          console.error('Background metadata enrichment failed:', err);
        });
        this.extractItemReviews.execute(item.Id, item.ListId, normalizedUrl).catch((err) => {
          console.error('Background AI review extraction trigger failed:', err);
        });
      }
      return;
    }

    const link = await this.itemRepo.createLink(
      item.Id,
      normalizedUrl,
      retailerName,
      price ?? null,
      null
    );

    this.enrichLinkMetadata.execute(link.Id, normalizedUrl, price ?? null).catch((err) => {
      console.error('Background metadata enrichment failed:', err);
    });
    this.extractItemReviews.execute(item.Id, item.ListId, normalizedUrl).catch((err) => {
      console.error('Background AI review extraction trigger failed:', err);
    });
  }
}
