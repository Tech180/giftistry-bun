import type { ItemRepository } from '../domain/ports/item.repository';
import type { ItemAudienceRepository } from '../domain/ports/item-audience.repository';
import type { WishlistRepository } from '@/modules/wishlist/domain/ports/wishlist.repository';
import type { ListShareRepository } from '@/modules/wishlist/domain/ports/list-share.repository';
import type { ItemAudienceUser } from '../domain/item-audience.entity';
import type { Item, ItemLink, Claim } from '../domain/item.entity';
import type { ItemDescriptionMetadata } from '../domain/item-description.util';
import type { ItemSubstitutionOption } from '../domain/item-substitution.entity';
import { buildSubstitutionSummaryWithClaimSummary } from '../domain/build-substitution-summary-with-claim-summary.util';
import { AppError } from '@/common/middlewares/error.middleware';
import { canUserViewItem, isItemSuggestion } from '../domain/item-visibility.service';
import { ListRole } from '@/common/domain/list-role.vo';
import { resolveItemMetadata } from '../domain/resolve-item-metadata.util';
import { sortWishlistItemsByExportOrder } from '../domain/sort-wishlist-items.util';
import {
  computeItemClaimSummary,
  type ItemClaimSummary,
} from '../domain/compute-item-claim-summary.util';
import { resolveCategoryPresentation } from '../domain/format-category-label.util';
import { canViewerSeeSubstitutionOption } from './can-viewer-see-substitution-option.util';
import { redactClaimsForViewer } from '../domain/redact-claims-for-viewer.util';

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

function toGuestItemDto(input: {
  item: Item;
  links: ItemLink[];
  metadata: ItemDescriptionMetadata | null;
  categoryKey: string;
  categoryLabel: string;
  claimSummary: ItemClaimSummary;
}): Record<string, unknown> {
  const { item, links, metadata, categoryKey, categoryLabel, claimSummary } = input;
  return {
    Id: item.Id,
    ListId: item.ListId,
    PriorityId: item.PriorityId,
    Name: item.Name,
    Description:
      metadata?.Text ?? (item.Description?.startsWith('{') ? null : item.Description),
    Category: item.Category,
    CategoryKey: categoryKey,
    CategoryLabel: categoryLabel,
    Priority: item.Priority,
    CreatedAt: item.CreatedAt,
    Links: links,
    Photos: item.Photos ?? [],
    Metadata: metadata,
    IsFavorite: item.IsFavorite === true || metadata?.IsFavorite === true,
    IsPinned: item.IsPinned === true || metadata?.IsPinned === true,
    DesiredQuantity: item.DesiredQuantity ?? metadata?.DesiredQuantity ?? null,
    MultiCount: item.MultiCount === true || metadata?.MultiCount === true,
    IsClaimed: false,
    ...claimSummary,
  };
}

export class ListItemsUseCase {
  constructor(
    private itemRepo: ItemRepository,
    private wishlistRepo: WishlistRepository,
    private audienceRepo: ItemAudienceRepository,
    private listShareRepo?: ListShareRepository
  ) {}

  async execute(listId: string, currentUserId: string | null): Promise<ListItemsResult> {
    const wishlist = await this.wishlistRepo.findById(listId);
    if (!wishlist) {
      throw new AppError('Wishlist not found', 404, 'NOT_FOUND');
    }

    const items = await this.itemRepo.findByListId(listId);
    const audienceMap = await this.audienceRepo.findByListId(listId);

    const isGuest = !currentUserId;
    const isOwner = currentUserId === wishlist.UserId;
    const hasExpired = wishlist.ExpiresAt ? new Date() > wishlist.ExpiresAt : false;

    let isListEditor = isOwner;
    if (!isGuest && !isOwner && this.listShareRepo && currentUserId) {
      const role = await this.listShareRepo.getRole(listId, currentUserId);
      isListEditor = !!role && ListRole.create(role).isAtLeast('collaborator');
    }
    const shouldHideClaims = isGuest || (isListEditor && !hasExpired);

    const parentIds = items.map((i) => i.Id);
    const substitutionsByParent = await this.itemRepo.findSubstitutionsByParentIds(parentIds);
    const allClaimsByList = shouldHideClaims
      ? []
      : await this.itemRepo.findClaimsByListId(listId);
    const claimsByItemId = new Map<string, Claim[]>();
    for (const claim of allClaimsByList) {
      const existing = claimsByItemId.get(claim.ItemId) ?? [];
      existing.push(claim);
      claimsByItemId.set(claim.ItemId, existing);
    }

    const itemsWithDetails = await Promise.all(
      items.map(async (item) => {
        const audienceUsers = audienceMap.get(item.Id) ?? [];
        const audienceUserIds = audienceUsers.map((user) => user.UserId);

        if (
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
        const links = await this.itemRepo.findLinksByItemId(item.Id);
        const claims = shouldHideClaims ? [] : (claimsByItemId.get(item.Id) ?? []);
        const claimsResult = shouldHideClaims ? [] : redactClaimsForViewer(claims, currentUserId);

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

        const subRows = substitutionsByParent.get(item.Id) ?? [];
        const substitutionOptions: ItemSubstitutionOption[] = [];
        for (const row of subRows) {
          const child = await this.itemRepo.findById(row.SubstitutionItemId);
          if (!child) continue;
          if (
            !canViewerSeeSubstitutionOption({
              row,
              child,
              wishlistOwnerId: wishlist.UserId,
              currentUserId,
            })
          ) {
            continue;
          }
          const childLinks = await this.itemRepo.findLinksByItemId(child.Id);
          const childClaims = shouldHideClaims
            ? []
            : redactClaimsForViewer(claimsByItemId.get(child.Id) ?? [], currentUserId);
          substitutionOptions.push({
            Id: row.Id,
            Kind: row.Kind,
            SortOrder: row.SortOrder,
            CreatedByUserId: row.CreatedByUserId,
            Item: buildSubstitutionSummaryWithClaimSummary(child, childLinks, childClaims, {
              allowGroupFunds: !!wishlist.AllowGroupFunds,
              hideClaims: shouldHideClaims,
            }),
          });
        }

        let activeSubstitutionId: string | null = null;
        if (currentUserId && !shouldHideClaims) {
          const claimedSub = substitutionOptions.find((opt) =>
            opt.Item.Claims.some((c) => c.UserId === currentUserId)
          );
          if (claimedSub) {
            activeSubstitutionId = claimedSub.Item.Id;
          }
        }

        if (isGuest) {
          return {
            ...toGuestItemDto({
              item,
              links,
              metadata,
              categoryKey: CategoryKey,
              categoryLabel: CategoryLabel,
              claimSummary,
            }),
            AllowSubstitutions: item.AllowSubstitutions !== false,
            SubstitutionOptions: substitutionOptions,
            ActiveSubstitutionId: null,
          };
        }

        return {
          Id: item.Id,
          ListId: item.ListId,
          PriorityId: item.PriorityId,
          SuggestedByUserId: item.SuggestedByUserId,
          SuggestedByUsername: item.SuggestedByUsername || null,
          SuggestedByFirstName: item.SuggestedByFirstName || null,
          SuggestedByLastName: item.SuggestedByLastName || null,
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
          Photos: item.Photos ?? [],
          IsFavorite: item.IsFavorite === true || metadata?.IsFavorite === true,
          IsPinned: item.IsPinned === true || metadata?.IsPinned === true,
          DesiredQuantity: item.DesiredQuantity ?? metadata?.DesiredQuantity ?? null,
          MultiCount: item.MultiCount === true || metadata?.MultiCount === true,
          AllowSubstitutions: item.AllowSubstitutions !== false,
          SubstitutionOptions: substitutionOptions,
          ActiveSubstitutionId: activeSubstitutionId,
          ...claimSummary,
        };
      })
    );

    const visible = itemsWithDetails.filter(
      (item): item is NonNullable<typeof item> => item !== null
    ) as Record<string, unknown>[];
    const sorted = sortWishlistItemsByExportOrder(visible as never);
    return {
      Items: sorted as Record<string, unknown>[],
      Groups: groupItemsByCategory(sorted as Record<string, unknown>[]),
    };
  }
}
