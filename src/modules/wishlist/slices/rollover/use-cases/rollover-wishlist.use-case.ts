import type { WishlistRepository } from '../../../domain/ports/wishlist.repository';
import type { ListShareRepository } from '../../../domain/ports/list-share.repository';
import type { ItemRepository } from '@/modules/item';
import type { CommentRepository } from '@/modules/comment';
import type { Wishlist } from '../../../domain/interfaces/wishlist.interface';
import { AppError } from '@/common/domain/errors/app-error';
import { nextRolloverTitle } from '../../../domain/utils/next-rollover-title.util';
import { isItemPurchasedForRollover } from '../../../domain/utils/is-item-purchased-for-rollover.util';

export class RolloverWishlistUseCase {
  constructor(
    private wishlistRepo: WishlistRepository,
    private listShareRepo: ListShareRepository,
    private itemRepo: ItemRepository,
    private commentRepo: CommentRepository
  ) {}

  async execute(listId: string): Promise<Wishlist> {
    const oldList = await this.wishlistRepo.findById(listId);
    if (!oldList) {
      throw new AppError('Wishlist not found', 404, 'NOT_FOUND');
    }

    if (!oldList.IsActive) {
      throw new AppError('Wishlist is already inactive/rolled over', 400, 'BAD_REQUEST');
    }

    // 1. Create a new active wishlist with the same settings, no expires_at initially
    const newWishlist = await this.wishlistRepo.create(
      oldList.UserId,
      nextRolloverTitle(oldList.Title),
      null, // no expiration date by default for the rolled-over list
      oldList.AllowGroupFunds,
      oldList.Category,
      oldList.RevealSuggestions,
      oldList.AiEnabled,
      oldList.WebSearchEnabled,
      oldList.ManualJobBackground !== false,
      oldList.AutoRollover === true
    );

    // Copy list shares to the new wishlist so collaborators still have access
    const oldShares = await this.listShareRepo.findSharesByListId(oldList.Id);
    for (const share of oldShares) {
      await this.listShareRepo.addShare(newWishlist.Id, share.UserId, share.Role);
    }

    // 2. Fetch all items from old list
    const oldItems = await this.itemRepo.findByListId(oldList.Id);
    const substitutionsByParent = await this.itemRepo.findSubstitutionsByParentIds(
      oldItems.map((item) => item.Id)
    );
    const allowGroupFunds = oldList.AllowGroupFunds === true;

    // For each item, check if it (or a substitution child) was purchased
    for (const item of oldItems) {
      const claims = await this.itemRepo.findClaimsByItemId(item.Id);
      const links = await this.itemRepo.findLinksByItemId(item.Id);

      let isPurchased = isItemPurchasedForRollover(claims, links, allowGroupFunds);

      if (!isPurchased) {
        const substitutionRows = substitutionsByParent.get(item.Id) ?? [];
        for (const row of substitutionRows) {
          const childClaims = await this.itemRepo.findClaimsByItemId(row.SubstitutionItemId);
          const childLinks = await this.itemRepo.findLinksByItemId(row.SubstitutionItemId);
          if (isItemPurchasedForRollover(childClaims, childLinks, allowGroupFunds)) {
            isPurchased = true;
            break;
          }
        }
      }

      // If NOT purchased (i.e. unpurchased), roll it over
      if (!isPurchased) {
        const newItem = await this.itemRepo.create(
          newWishlist.Id,
          item.PriorityId,
          item.SuggestedByUserId,
          item.Name,
          item.Description,
          item.IsHiddenIdea,
          item.Category || 'uncategorized',
          item.IsSuggestion === true,
          item.Priority ?? null,
          {
            IsFavorite: item.IsFavorite === true,
            IsPinned: item.IsPinned === true,
            DesiredQuantity: item.DesiredQuantity ?? null,
            MultiCount: item.MultiCount === true,
            OtherUsersCanSee: item.OtherUsersCanSee ?? null,
            CustomFields: item.CustomFields ?? null,
            Variations: item.Variations ?? null,
            Photos: item.Photos ?? [],
          }
        );

        // Copy links
        for (const link of links) {
          await this.itemRepo.createLink(
            newItem.Id,
            link.Url,
            link.RetailerName,
            link.ExtractedPrice,
            link.ExtractedImageUrl
          );
        }
      }
    }

    // 3. Roll over comments that transcend future lists (is_rollover = true)
    const oldComments = await this.commentRepo.findByListId(oldList.Id);
    const rolloverComments = oldComments.filter(c => c.IsRollover);

    for (const comment of rolloverComments) {
      await this.commentRepo.create({
        listId: newWishlist.Id,
        userId: comment.UserId,
        commenterName: comment.CommenterName,
        content: comment.Content,
        isOwnerVisible: comment.IsOwnerVisible,
        isRollover: true, // retains is_rollover for subsequent rollovers
        parentId: null,
        imageUrl: comment.ImageUrl ?? null,
        visibleToUserIds: comment.VisibleToUserIds ?? null,
      });
    }

    // 4. Deactivate the old wishlist
    await this.wishlistRepo.updateActive(oldList.Id, false);

    return newWishlist;
  }
}
