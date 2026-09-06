import type { ItemRepository } from '../domain/ports/item.repository';
import type { ItemAudienceRepository } from '../domain/ports/item-audience.repository';
import type { Item } from '../domain/item.entity';
import type { AssertItemVisibleUseCase } from './assert-item-visible.use-case';
import type { EnrichLinkMetadataUseCase } from './enrich-link-metadata.use-case';
import type { ExtractItemReviewsUseCase } from './extract-item-reviews.use-case';
import type { NotifyClaimersItemRemovedUseCase } from './notify-claimers-item-removed.use-case';
import { AppError } from '@/common/middlewares/error.middleware';
import { canUserMutateItem, isItemSuggestion } from '../domain/item-visibility.service';
import { WishlistEntity } from '@/modules/wishlist/domain/wishlist.entity';
import type { ItemDescriptionMetadata } from '../domain/item-description.util';
import { resolvePlainDescriptionText } from '../domain/resolve-item-metadata.util';
import type { ItemMetadataWrite } from '../domain/ports/item.repository';
import { normalizeItemPhotosWrite } from '../domain/normalize-item-photos.util';
import type { AssertUserCanUseCase } from '@/common/application/user-policy.use-cases';
import { assertWishlistMutable } from '@/modules/wishlist/domain/assert-wishlist-mutable.util';
import { publishListChanged } from '@/modules/wishlist/infrastructure/wishlist-list-publisher';
import { assertLinkGroupSupportsLinkedItems } from '../domain/item-supports-linked-items.util';

function toMetadataWrite(
  metadata: ItemDescriptionMetadata | null | undefined
): ItemMetadataWrite | null {
  if (!metadata) return null;
  const photos = normalizeItemPhotosWrite(metadata.Photos);
  return {
    IsFavorite: metadata.IsFavorite === true,
    IsPinned: metadata.IsPinned === true,
    DesiredQuantity: metadata.DesiredQuantity ?? null,
    MultiCount: metadata.MultiCount === true,
    OtherUsersCanSee:
      metadata.OtherUsersCanSee === undefined ? null : metadata.OtherUsersCanSee,
    AllowSubstitutions: metadata.AllowSubstitutions !== false,
    CustomFields: metadata.CustomFields ?? null,
    Variations: metadata.Variations ?? null,
    ...(photos !== undefined ? { Photos: photos ?? [] } : {}),
  };
}

export class UpdateItemUseCase {
  constructor(
    private itemRepo: ItemRepository,
    private audienceRepo: ItemAudienceRepository,
    private assertItemVisible: AssertItemVisibleUseCase,
    private enrichLinkMetadata: EnrichLinkMetadataUseCase,
    private extractItemReviews: ExtractItemReviewsUseCase,
    private assertUserCan: AssertUserCanUseCase,
    private notifyClaimersItemRemoved?: NotifyClaimersItemRemovedUseCase
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
    metadata?: ItemDescriptionMetadata | null,
    isHiddenIdea?: boolean,
    /** When set, write this onto the item link as ExtractedImageUrl (enrich scrape). */
    extractedImageUrl?: string | null
  ): Promise<Item> {
    if (!itemId) {
      throw new AppError('Item ID is required', 400, 'BAD_REQUEST');
    }
    if (!name) {
      throw new AppError('Item name is required', 400, 'BAD_REQUEST');
    }

    const visible = await this.assertItemVisible.execute(itemId, currentUserId);
    assertWishlistMutable(visible.wishlist);
    if (!canUserMutateItem({ ...visible, currentUserId })) {
      throw new AppError('Forbidden', 403, 'FORBIDDEN');
    }

    const item = visible.item;

    let resolvedHidden: boolean | undefined = undefined;
    if (isHiddenIdea !== undefined) {
      const isOwner = WishlistEntity.from(visible.wishlist).isOwner(currentUserId);
      if (isOwner && isHiddenIdea) {
        throw new AppError(
          'Forbidden: Owner cannot add hidden ideas to their own list',
          403,
          'FORBIDDEN'
        );
      }
      const suggestion = isItemSuggestion(item, visible.wishlist.UserId);
      resolvedHidden = suggestion ? isHiddenIdea : false;
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
          Photos: [],
        };
      } else {
        resolvedDescription = resolvePlainDescriptionText(description, metadata);
        metadataWrite = toMetadataWrite(metadata);
        if (metadataWrite?.Photos && metadataWrite.Photos.length > 0) {
          await this.assertUserCan.execute(currentUserId, 'CanUploadImages');
        }
      }
    }

    const previousAllow = item.AllowSubstitutions !== false;
    const nextAllow =
      metadataWrite && metadataWrite.AllowSubstitutions !== undefined
        ? metadataWrite.AllowSubstitutions !== false
        : previousAllow;
    const allowTurnedOff = previousAllow && !nextAllow;

    if (allowTurnedOff && this.notifyClaimersItemRemoved && !item.IsSubstitution) {
      const listTitle = visible.wishlist.Title?.trim() || 'a wishlist';
      const subRows = await this.itemRepo.findSubstitutionsByParentId(itemId);
      for (const row of subRows) {
        if (row.Kind !== 'owner_approved') continue;
        const child = await this.itemRepo.findById(row.SubstitutionItemId);
        if (!child) continue;
        const claims = await this.itemRepo.findClaimsByItemId(child.Id);
        await this.notifyClaimersItemRemoved.execute({
          claims,
          itemName: child.Name,
          listId: visible.wishlist.Id,
          listTitle,
          excludeUserId: visible.wishlist.UserId,
        });
      }
    }

    const updated = await this.itemRepo.update(
      itemId,
      name,
      resolvedDescription,
      priorityId,
      category,
      priority,
      metadataWrite ?? null,
      resolvedHidden
    );

    if (metadata !== undefined) {
      const linkedIds = metadata?.LinkedItemIds ?? [];
      if (linkedIds.length > 0) {
        const sourceForCheck: Item = {
          ...item,
          DesiredQuantity:
            metadata?.DesiredQuantity !== undefined
              ? metadata.DesiredQuantity
              : item.DesiredQuantity,
          MultiCount:
            metadata?.MultiCount !== undefined
              ? metadata.MultiCount === true
              : item.MultiCount,
        };
        const wishlistItems = await this.itemRepo.findByListId(item.ListId);
        const peers = linkedIds
          .map((id) => wishlistItems.find((i) => i.Id === id))
          .filter((peer): peer is Item => !!peer);
        assertLinkGroupSupportsLinkedItems(
          [sourceForCheck, ...peers],
          visible.wishlist.UserId
        );
      }

      await this.itemRepo.replaceLinkedItemIds(itemId, linkedIds);
      updated.LinkedItemIds = linkedIds;

      const relatedIds = metadata?.RelatedItemIds ?? [];
      await this.itemRepo.replaceRelatedItemIds(itemId, relatedIds);
      updated.RelatedItemIds = relatedIds;
    }

    let sharedWith = await this.audienceRepo.findByItemId(itemId);
    if (sharedWithUserIds !== undefined) {
      sharedWith = await this.audienceRepo.setAudience(itemId, sharedWithUserIds ?? []);
    }

    if (linkUrl !== undefined) {
      await this.syncItemLink(item, linkUrl, price, websiteName ?? null, extractedImageUrl);
    }

    publishListChanged(item.ListId, {
      reason: 'item.updated',
      itemId: updated.Id,
      actorUserId: currentUserId,
    });

    return {
      ...updated,
      SharedWith: sharedWith.length > 0 ? sharedWith : undefined,
    };
  }

  private async syncItemLink(
    item: Item,
    linkUrl: string | null,
    price: number | null | undefined,
    websiteName: string | null,
    extractedImageUrl?: string | null
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

    const resolvedImageUrl =
      extractedImageUrl !== undefined
        ? extractedImageUrl?.trim() || null
        : undefined;

    const existingLink = existingLinks[0];
    if (existingLink) {
      const urlChanged = existingLink.Url !== normalizedUrl;
      const resolvedPrice = price !== undefined ? price : existingLink.ExtractedPrice;
      const imageUrl =
        resolvedImageUrl !== undefined
          ? resolvedImageUrl
          : existingLink.ExtractedImageUrl;
      await this.itemRepo.updateLink(
        existingLink.Id,
        normalizedUrl,
        retailerName,
        resolvedPrice,
        imageUrl
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
      resolvedImageUrl ?? null
    );

    this.enrichLinkMetadata.execute(link.Id, normalizedUrl, price ?? null).catch((err) => {
      console.error('Background metadata enrichment failed:', err);
    });
    this.extractItemReviews.execute(item.Id, item.ListId, normalizedUrl).catch((err) => {
      console.error('Background AI review extraction trigger failed:', err);
    });
  }
}
