import type { ItemRepository } from '../domain/ports/item.repository';
import type { WishlistRepository } from '@/modules/wishlist/domain/ports/wishlist.repository';
import type { Claim } from '../domain/item.entity';
import { AppError } from '@/common/middlewares/error.middleware';

export class ClaimItemUseCase {
  constructor(
    private itemRepo: ItemRepository,
    private wishlistRepo: WishlistRepository
  ) {}

  async execute(
    itemId: string,
    userId: string | null,
    amount: number | null,
    claimedByName: string | null
  ): Promise<Claim> {
    const item = await this.itemRepo.findById(itemId);
    if (!item) {
      throw new AppError('Item not found', 404, 'NOT_FOUND');
    }

    const wishlist = await this.wishlistRepo.findById(item.ListId);
    if (!wishlist) {
      throw new AppError('Associated wishlist not found', 404, 'NOT_FOUND');
    }

    if (!wishlist.IsActive) {
      throw new AppError('Cannot claim items on an expired/inactive wishlist', 400, 'BAD_REQUEST');
    }

    const claims = await this.itemRepo.findClaimsByItemId(itemId);
    
    // Check if fully claimed by a standard purchase (amount = null)
    const isFullyClaimed = claims.some(c => c.Amount === null);
    if (isFullyClaimed) {
      throw new AppError('Item has already been purchased', 409, 'ALREADY_CLAIMED');
    }

    const links = await this.itemRepo.findLinksByItemId(itemId);
    const itemPrice = links.reduce((max, link) => Math.max(max, Number(link.ExtractedPrice || 0)), 0);

    if (amount !== null && amount > 0) {
      // Group fund contribution
      if (!wishlist.AllowGroupFunds) {
        throw new AppError('Group funding is not enabled for this wishlist', 400, 'BAD_REQUEST');
      }

      // Calculate total claimed so far
      const totalClaimed = claims.reduce((sum, c) => sum + Number(c.Amount || 0), 0);
      
      if (itemPrice > 0 && totalClaimed + amount > itemPrice) {
        const remaining = Math.max(0, itemPrice - totalClaimed);
        throw new AppError(`Claim amount exceeds the item price. Remaining: $${remaining.toFixed(2)}`, 400, 'BAD_REQUEST');
      }

      return await this.itemRepo.createClaim(itemId, userId, amount, claimedByName);
    } else {
      // Full purchase claim
      if (claims.length > 0) {
        throw new AppError('Item is already fully or partially claimed', 409, 'ALREADY_CLAIMED');
      }
      return await this.itemRepo.createClaim(itemId, userId, null, claimedByName);
    }
  }
}
