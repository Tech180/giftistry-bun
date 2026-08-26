import type { WishlistRepository } from '../domain/ports/wishlist.repository';
import type { ItemRepository, ItemMetadataWrite } from '@/modules/item/domain/ports/item.repository';
import type { ItemAudienceRepository } from '@/modules/item/domain/ports/item-audience.repository';
import type { UserRepository } from '@/modules/auth/domain/ports/user.repository';
import type { ServerConfigRepository } from '@/modules/system/domain/ports/server-config.repository';
import type { AssertCanCreateWishlistUseCase, AssertUserCanUseCase } from '@/common/application/user-policy.use-cases';
import type { Wishlist } from '../domain/wishlist.entity';
import type { Item } from '@/modules/item/domain/item.entity';
import { AppError } from '@/common/middlewares/error.middleware';
import { nextDuplicateTitle } from '../domain/next-duplicate-title.util';
import { canUserViewItem } from '@/modules/item/domain/item-visibility.service';
import { resolveItemMetadata, resolvePlainDescriptionText } from '@/modules/item/domain/resolve-item-metadata.util';
import { assertOwnerCanEnableListAi } from '@/common/application/user-ai-access.util';
import {
  assertOwnerCanEnableListWebSearch,
  serverAllowsWebSearch,
} from '@/common/application/user-web-search-access.util';

function remapIds(ids: string[] | undefined, idMap: Map<string, string>): string[] {
  if (!ids?.length) return [];
  return ids.map((id) => idMap.get(id)).filter((id): id is string => !!id);
}

function toCloneMetadataWrite(
  item: Item,
  options: { includeLinks: boolean; idMap?: Map<string, string> }
): ItemMetadataWrite {
  const metadata = resolveItemMetadata(item);
  const write: ItemMetadataWrite = {
    IsFavorite: item.IsFavorite === true || metadata?.IsFavorite === true,
    IsPinned: item.IsPinned === true || metadata?.IsPinned === true,
    DesiredQuantity: item.DesiredQuantity ?? metadata?.DesiredQuantity ?? null,
    MultiCount: item.MultiCount === true || metadata?.MultiCount === true,
    AllowSubstitutions: item.AllowSubstitutions !== false,
    CustomFields: metadata?.CustomFields ?? item.CustomFields ?? null,
    Variations: metadata?.Variations ?? item.Variations ?? null,
    Photos: item.Photos ?? [],
  };

  if (options.includeLinks && options.idMap) {
    const linked = remapIds(item.LinkedItemIds ?? metadata?.LinkedItemIds, options.idMap);
    const related = remapIds(item.RelatedItemIds ?? metadata?.RelatedItemIds, options.idMap);
    // Linked/related are applied via replace* after create; keep write free of them.
    void linked;
    void related;
  }

  return write;
}

/**
 * Clones a wishlist the caller can view onto their own account.
 * Does not copy shares, claims, comments, or claimer_custom substitutions.
 */
export class DuplicateWishlistUseCase {
  constructor(
    private wishlistRepo: WishlistRepository,
    private itemRepo: ItemRepository,
    private audienceRepo: ItemAudienceRepository,
    private userRepo: UserRepository,
    private assertCanCreateWishlist: AssertCanCreateWishlistUseCase,
    private assertUserCan: AssertUserCanUseCase,
    private configRepo: ServerConfigRepository
  ) {}

  async execute(sourceListId: string, currentUserId: string): Promise<Wishlist> {
    const source = await this.wishlistRepo.findById(sourceListId);
    if (!source) {
      throw new AppError('Wishlist not found', 404, 'NOT_FOUND');
    }

    await this.assertCanCreateWishlist.execute(currentUserId);

    const owned = await this.wishlistRepo.findByUserId(currentUserId);
    const title = nextDuplicateTitle(
      source.Title,
      owned.map((list) => list.Title)
    );

    const config = this.configRepo.load();
    let aiEnabled = source.AiEnabled === true;
    if (aiEnabled) {
      try {
        await assertOwnerCanEnableListAi(currentUserId, this.userRepo, this.assertUserCan);
      } catch {
        aiEnabled = false;
      }
    } else if (config.AiEnabled) {
      try {
        await assertOwnerCanEnableListAi(currentUserId, this.userRepo, this.assertUserCan);
        aiEnabled = source.AiEnabled !== false;
      } catch {
        aiEnabled = false;
      }
    }

    let webSearchEnabled = aiEnabled && source.WebSearchEnabled === true;
    if (webSearchEnabled) {
      try {
        await assertOwnerCanEnableListWebSearch(
          currentUserId,
          this.userRepo,
          this.assertUserCan,
          config
        );
      } catch {
        webSearchEnabled = false;
      }
    } else if (aiEnabled && serverAllowsWebSearch(config) && source.WebSearchEnabled !== false) {
      try {
        await assertOwnerCanEnableListWebSearch(
          currentUserId,
          this.userRepo,
          this.assertUserCan,
          config
        );
        webSearchEnabled = source.WebSearchEnabled === true;
      } catch {
        webSearchEnabled = false;
      }
    }
    if (!aiEnabled) webSearchEnabled = false;

    const newWishlist = await this.wishlistRepo.create(
      currentUserId,
      title,
      null,
      source.AllowGroupFunds === true,
      source.Category,
      source.RevealSuggestions !== false,
      aiEnabled,
      webSearchEnabled,
      source.ManualJobBackground !== false,
      source.AutoRollover === true
    );

    const items = await this.itemRepo.findByListId(sourceListId);
    const audienceMap = await this.audienceRepo.findByListId(sourceListId);
    const substitutionsByParent = await this.itemRepo.findSubstitutionsByParentIds(
      items.map((item) => item.Id)
    );

    const visibleParents: Item[] = [];
    for (const item of items) {
      const audienceUsers = audienceMap.get(item.Id) ?? [];
      if (
        !canUserViewItem({
          item,
          wishlist: source,
          currentUserId,
          audienceUserIds: audienceUsers.map((user) => user.UserId),
        })
      ) {
        continue;
      }
      visibleParents.push(item);
    }

    const idMap = new Map<string, string>();

    for (const item of visibleParents) {
      const metadata = resolveItemMetadata(item);
      const plainText = resolvePlainDescriptionText(item.Description, metadata);
      const metadataWrite = toCloneMetadataWrite(item, { includeLinks: false });

      const newItem = await this.itemRepo.create(
        newWishlist.Id,
        item.PriorityId,
        null,
        item.Name,
        plainText,
        false,
        item.Category || 'uncategorized',
        false,
        item.Priority ?? null,
        metadataWrite
      );
      idMap.set(item.Id, newItem.Id);

      const links = await this.itemRepo.findLinksByItemId(item.Id);
      for (const link of links) {
        await this.itemRepo.createLink(
          newItem.Id,
          link.Url,
          link.RetailerName,
          link.ExtractedPrice,
          link.ExtractedImageUrl
        );
      }

      const rows = substitutionsByParent.get(item.Id) ?? [];
      for (const row of rows) {
        if (row.Kind !== 'owner_approved') continue;
        const child = await this.itemRepo.findById(row.SubstitutionItemId);
        if (!child) continue;

        const childMeta = resolveItemMetadata(child);
        const childText = resolvePlainDescriptionText(child.Description, childMeta);
        const childWrite = toCloneMetadataWrite(child, { includeLinks: false });

        const created = await this.itemRepo.createSubstitution({
          listId: newWishlist.Id,
          parentItemId: newItem.Id,
          name: child.Name,
          description: childText,
          createdByUserId: currentUserId,
          kind: 'owner_approved',
          sortOrder: row.SortOrder,
          category: child.Category || item.Category || 'uncategorized',
          priorityId: child.PriorityId,
          priority: child.Priority ?? null,
          isHiddenIdea: false,
          metadata: childWrite,
        });

        const childLinks = await this.itemRepo.findLinksByItemId(child.Id);
        for (const link of childLinks) {
          await this.itemRepo.createLink(
            created.SubstitutionItemId,
            link.Url,
            link.RetailerName,
            link.ExtractedPrice,
            link.ExtractedImageUrl
          );
        }
      }
    }

    for (const item of visibleParents) {
      const newId = idMap.get(item.Id);
      if (!newId) continue;
      const metadata = resolveItemMetadata(item);
      const linked = remapIds(item.LinkedItemIds ?? metadata?.LinkedItemIds, idMap);
      const related = remapIds(item.RelatedItemIds ?? metadata?.RelatedItemIds, idMap);
      if (linked.length > 0) {
        await this.itemRepo.replaceLinkedItemIds(newId, linked);
      }
      if (related.length > 0) {
        await this.itemRepo.replaceRelatedItemIds(newId, related);
      }
    }

    return newWishlist;
  }
}
