import type { ItemRepository } from '../domain/ports/item.repository';
import type { WishlistRepository } from '@/modules/wishlist/domain/ports/wishlist.repository';
import type { Claim } from '../domain/item.entity';
import type { AssertItemVisibleUseCase } from './assert-item-visible.use-case';
import type { CreateClaimInput } from '../domain/ports/item.repository';
import { AppError } from '@/common/middlewares/error.middleware';

export class ClaimItemUseCase {
  constructor(
    private itemRepo: ItemRepository,
    private wishlistRepo: WishlistRepository,
    private assertItemVisible: AssertItemVisibleUseCase
  ) {}

  /**
   * Validates claim rules and returns the insert payload without writing.
   * Used by single claim and transactional linked-claim flows.
   */
  async prepare(
    itemId: string,
    userId: string | null,
    amount: number | null,
    claimedByName: string | null,
    anonymous: boolean = false,
    quantity: number = 1,
    selection: string | null = null
  ): Promise<CreateClaimInput> {
    if (!userId) {
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    await this.assertItemVisible.execute(itemId, userId);

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

    const hasExpired = wishlist.ExpiresAt ? new Date() > new Date(wishlist.ExpiresAt) : false;
    if (hasExpired) {
      throw new AppError('Cannot claim items on an expired/inactive wishlist', 400, 'BAD_REQUEST');
    }

    const claims = await this.itemRepo.findClaimsByItemId(itemId);

    let isMultiCount = item.MultiCount === true;
    let desiredQuantity = item.DesiredQuantity != null ? Number(item.DesiredQuantity) : 1;
    let variations: Array<{ Name?: string; Quantity?: number }> = Array.isArray(item.Variations)
      ? item.Variations
      : [];
    if (!isMultiCount && item.Description) {
      try {
        if (item.Description.startsWith('{') && item.Description.endsWith('}')) {
          const parsed = JSON.parse(item.Description);
          if (parsed && typeof parsed === 'object') {
            if (parsed.MultiCount) {
              isMultiCount = true;
              desiredQuantity = Number(parsed.DesiredQuantity) || 1;
              variations = parsed.Variations || [];
            }
          }
        }
      } catch (_) {}
    }

    if (isMultiCount) {
      const totalClaimedQty = claims.reduce((sum, c) => sum + (c.Quantity || 1), 0);
      if (totalClaimedQty + quantity > desiredQuantity) {
        const remaining = Math.max(0, desiredQuantity - totalClaimedQty);
        throw new AppError(`Claim quantity exceeds remaining available items. Remaining: ${remaining}`, 400, 'BAD_REQUEST');
      }

      if (selection) {
        const matchVar = variations.find((v) => v.Name === selection);
        if (matchVar) {
          const varLimit = Number(matchVar.Quantity) || 0;
          const varClaimed = claims
            .filter((c) => c.Selection === selection)
            .reduce((sum, c) => sum + (c.Quantity || 1), 0);
          if (varClaimed + quantity > varLimit) {
            const remainingVar = Math.max(0, varLimit - varClaimed);
            throw new AppError(
              `Claim quantity exceeds remaining available for variation "${selection}". Remaining: ${remainingVar}`,
              400,
              'BAD_REQUEST'
            );
          }
        }
      }

      return {
        itemId,
        userId,
        amount: null,
        claimedByName,
        anonymous,
        quantity,
        selection,
      };
    }

    const isFullyClaimed = claims.some((c) => c.Amount === null);
    if (isFullyClaimed) {
      throw new AppError('Item has already been purchased', 409, 'ALREADY_CLAIMED');
    }

    const links = await this.itemRepo.findLinksByItemId(itemId);
    const itemPrice = links.reduce((max, link) => Math.max(max, Number(link.ExtractedPrice || 0)), 0);

    if (amount !== null && amount > 0) {
      if (!wishlist.AllowGroupFunds) {
        throw new AppError('Group funding is not enabled for this wishlist', 400, 'BAD_REQUEST');
      }

      const totalClaimed = claims.reduce((sum, c) => sum + Number(c.Amount || 0), 0);

      if (itemPrice > 0 && totalClaimed + amount > itemPrice) {
        const remaining = Math.max(0, itemPrice - totalClaimed);
        throw new AppError(
          `Claim amount exceeds the item price. Remaining: $${remaining.toFixed(2)}`,
          400,
          'BAD_REQUEST'
        );
      }

      return {
        itemId,
        userId,
        amount,
        claimedByName,
        anonymous,
        quantity: 1,
        selection: null,
      };
    }

    if (claims.length > 0) {
      throw new AppError('Item is already fully or partially claimed', 409, 'ALREADY_CLAIMED');
    }

    return {
      itemId,
      userId,
      amount: null,
      claimedByName,
      anonymous,
      quantity: 1,
      selection: null,
    };
  }

  async execute(
    itemId: string,
    userId: string | null,
    amount: number | null,
    claimedByName: string | null,
    anonymous: boolean = false,
    quantity: number = 1,
    selection: string | null = null
  ): Promise<Claim> {
    const prepared = await this.prepare(
      itemId,
      userId,
      amount,
      claimedByName,
      anonymous,
      quantity,
      selection
    );
    return await this.itemRepo.createClaim(
      prepared.itemId,
      prepared.userId,
      prepared.amount,
      prepared.claimedByName,
      prepared.anonymous,
      prepared.quantity,
      prepared.selection
    );
  }
}
