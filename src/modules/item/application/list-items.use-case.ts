import type { ItemRepository } from '../domain/ports/item.repository';
import type { ItemAudienceRepository } from '../domain/ports/item-audience.repository';
import type { WishlistRepository } from '@/modules/wishlist/domain/ports/wishlist.repository';
import type { ItemAudienceUser } from '../domain/item-audience.entity';
import { AppError } from '@/common/middlewares/error.middleware';
import { canUserViewItem, isItemSuggestion } from '../domain/item-visibility.service';
import { resolveItemMetadata } from '../domain/resolve-item-metadata.util';
import { sortWishlistItemsByExportOrder } from '../domain/sort-wishlist-items.util';
import { computeItemClaimSummary } from '../domain/compute-item-claim-summary.util';
import { resolveCategoryPresentation } from '../domain/format-category-label.util';

export interface ListItemGroupDto {
  CategoryKey: string;
  CategoryLabel: string;
  Items: Record<string, unknown>[];
}

export interface ListItemsResult {
  Items: Record<string, unknown>[];
  Groups: ListItemGroupDto[];
}

function groupItemsByCategory(items: Record<string, unknown>[]): ListItemGroupDto[] {
  const groups: ListItemGroupDto[] = [];
  const indexByKey = new Map<string, number>();

  for (const item of items) {
    const key = String(item.CategoryKey || 'uncategorized');
    const label = String(item.CategoryLabel || 'General Items');
    let index = indexByKey.get(key);
    if (index === undefined) {
      index = groups.length;
      indexByKey.set(key, index);
      groups.push({ CategoryKey: key, CategoryLabel: label, Items: [] });
    }
    groups[index].Items.push(item);
  }

  return groups;
}

export class ListItemsUseCase {
  constructor(
    private itemRepo: ItemRepository,
    private wishlistRepo: WishlistRepository,
    private audienceRepo: ItemAudienceRepository
  ) {}

  async execute(listId: string, currentUserId: string | null): Promise<ListItemsResult> {
    const wishlist = await this.wishlistRepo.findById(listId);
    if (!wishlist) {
      throw new AppError('Wishlist not found', 404, 'NOT_FOUND');
    }

    const items = await this.itemRepo.findByListId(listId);
    const audienceMap = await this.audienceRepo.findByListId(listId);

    const isOwner = currentUserId === wishlist.UserId;
    const hasExpired = wishlist.ExpiresAt ? new Date() > wishlist.ExpiresAt : false;

    const itemsWithDetails = await Promise.all(
      items.map(async (item) => {
        const audienceUsers = audienceMap.get(item.Id) ?? [];
        const audienceUserIds = audienceUsers.map((user) => user.UserId);

        if (
          !currentUserId ||
          !canUserViewItem({
            item,
            wishlist,
            currentUserId,
            audienceUserIds,
          })
        ) {
          return null;
        }

        const isSuggestion = isItemSuggestion(item, wishlist.UserId);

        const [links, claims] = await Promise.all([
          this.itemRepo.findLinksByItemId(item.Id),
          this.itemRepo.findClaimsByItemId(item.Id),
        ]);

        const shouldHideClaims = isOwner && !hasExpired;

        const claimsResult = shouldHideClaims
          ? []
          : claims.map((c) => {
              if (c.Anonymous && c.UserId !== currentUserId) {
                return {
                  ...c,
                  UserId: null,
                  ClaimedByName: 'Anonymous',
                };
              }
              return c;
            });

        const sharedWith: ItemAudienceUser[] | undefined =
          audienceUsers.length > 0 ? audienceUsers : undefined;

        const metadata = resolveItemMetadata(item);
        const { CategoryKey, CategoryLabel } = resolveCategoryPresentation(item.Category);
        const claimSummary = computeItemClaimSummary({
          description: item.Description,
          metadata,
          claims: shouldHideClaims ? [] : claims,
          links,
          allowGroupFunds: !!wishlist.AllowGroupFunds,
          hideClaims: shouldHideClaims,
        });

        return {
          Id: item.Id,
          ListId: item.ListId,
          PriorityId: item.PriorityId,
          SuggestedByUserId: item.SuggestedByUserId,
          SuggestedByUsername: item.SuggestedByUsername || null,
          Name: item.Name,
          Description:
            metadata?.Text ?? (item.Description?.startsWith('{') ? null : item.Description),
          IsHiddenIdea: item.IsHiddenIdea,
          IsSuggestion: isSuggestion,
          Category: item.Category,
          CategoryKey,
          CategoryLabel,
          Priority: item.Priority,
          CreatedAt: item.CreatedAt,
          SharedWith: sharedWith,
          Links: links,
          Claims: claimsResult,
          IsClaimed: shouldHideClaims ? false : claims.length > 0,
          Metadata: metadata,
          IsFavorite: item.IsFavorite === true || metadata?.IsFavorite === true,
          IsPinned: item.IsPinned === true || metadata?.IsPinned === true,
          DesiredQuantity: item.DesiredQuantity ?? metadata?.DesiredQuantity ?? null,
          MultiCount: item.MultiCount === true || metadata?.MultiCount === true,
          ...claimSummary,
        };
      })
    );

    const visible = itemsWithDetails.filter(
      (item): item is NonNullable<typeof item> => item !== null
    );
    const sorted = sortWishlistItemsByExportOrder(visible);
    return {
      Items: sorted,
      Groups: groupItemsByCategory(sorted),
    };
  }
}
