import type { WishlistRepository } from '../domain/ports/wishlist.repository';
import type { ListShareRepository } from '../domain/ports/list-share.repository';
import type { ItemRepository } from '@/modules/item/domain/ports/item.repository';
import type { CommentRepository } from '@/modules/comment/domain/ports/comment.repository';
import type { Wishlist } from '../domain/wishlist.entity';
import { AppError } from '@/common/middlewares/error.middleware';

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
      oldList.Title,
      null, // no expiration date by default for the rolled-over list
      oldList.AllowGroupFunds
    );

    // Copy list shares to the new wishlist so collaborators still have access
    const oldShares = await this.listShareRepo.findSharesByListId(oldList.Id);
    for (const share of oldShares) {
      await this.listShareRepo.addShare(newWishlist.Id, share.UserId, share.Role);
    }

    // 2. Fetch all items from old list
    const oldItems = await this.itemRepo.findByListId(oldList.Id);

    // For each item, check if it was purchased (fully claimed)
    for (const item of oldItems) {
      const claims = await this.itemRepo.findClaimsByItemId(item.Id);
      const links = await this.itemRepo.findLinksByItemId(item.Id);

      const totalExtractedPrice = links.reduce((acc, link) => Math.max(acc, link.ExtractedPrice || 0), 0);
      const totalClaimedAmount = claims.reduce((acc, claim) => acc + (claim.Amount || 0), 0);

      const isFullyClaimed = oldList.AllowGroupFunds && totalExtractedPrice > 0
        ? totalClaimedAmount >= totalExtractedPrice
        : claims.length > 0;

      // If NOT fully claimed (i.e. unpurchased), roll it over
      if (!isFullyClaimed) {
        const newItem = await this.itemRepo.create(
          newWishlist.Id,
          item.PriorityId,
          item.SuggestedByUserId,
          item.Name,
          item.Description,
          item.IsHiddenIdea,
          item.Category || 'uncategorized'
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
      await this.commentRepo.create(
        newWishlist.Id,
        comment.UserId,
        comment.CommenterName,
        comment.Content,
        comment.IsOwnerVisible,
        true // retains is_rollover for subsequent rollovers
      );
    }

    // 4. Deactivate the old wishlist
    await this.wishlistRepo.updateActive(oldList.Id, false);

    return newWishlist;
  }
}
