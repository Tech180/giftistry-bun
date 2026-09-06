import type { ItemRepository } from '../domain/ports/item.repository';
import type { WishlistRepository } from '@/modules/wishlist/domain/ports/wishlist.repository';
import type { Claim } from '../domain/item.entity';
import type { AssertItemVisibleUseCase } from './assert-item-visible.use-case';
import type { CreateClaimInput } from '../domain/ports/item.repository';
import type { PostGroupFundCommentUseCase } from './post-group-fund-comment.use-case';
import type { NotifyGroupFundContributorsUseCase } from './notify-group-fund-contributors.use-case';
import { AppError } from '@/common/middlewares/error.middleware';
import {
  isMoneyAmountAtLeast,
  moneyAmountLeftover,
  wouldExceedMoneyTarget,
} from '@/common/domain/compare-money-amount.util';
import { assertWishlistMutable } from '@/modules/wishlist/domain/assert-wishlist-mutable.util';
import { publishListChanged } from '@/modules/wishlist/infrastructure/wishlist-list-publisher';
import { isItemSuggestion } from '../domain/item-visibility.service';

export class ClaimItemUseCase {
  constructor(
    private itemRepo: ItemRepository,
    private wishlistRepo: WishlistRepository,
    private assertItemVisible: AssertItemVisibleUseCase,
    private postGroupFundComment?: PostGroupFundCommentUseCase,
    private notifyGroupFundContributors?: NotifyGroupFundContributorsUseCase
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

    assertWishlistMutable(wishlist);

    // Resolve parent group for substitution mutual exclusivity.
    let parentItemId = itemId;
    let substitutionRow = null as Awaited<
      ReturnType<ItemRepository['findSubstitutionByChildItemId']>
    >;
    if (item.IsSubstitution) {
      substitutionRow = await this.itemRepo.findSubstitutionByChildItemId(itemId);
      if (!substitutionRow) {
        throw new AppError('Substitution link not found', 404, 'NOT_FOUND');
      }
      parentItemId = substitutionRow.ParentItemId;
      if (
        substitutionRow.Kind === 'claimer_custom' &&
        substitutionRow.CreatedByUserId !== userId
      ) {
        throw new AppError(
          'Only the creator can claim a custom substitution',
          403,
          'FORBIDDEN'
        );
      }
    }

    const parentItem =
      parentItemId === itemId ? item : await this.itemRepo.findById(parentItemId);
    if (!parentItem) {
      throw new AppError('Parent item not found', 404, 'NOT_FOUND');
    }
    if (isItemSuggestion(parentItem, wishlist.UserId)) {
      throw new AppError('Cannot claim substitutions on suggestions', 400, 'BAD_REQUEST');
    }

    // One claim slot per user per parent group (main OR one sub).
    const groupIds = [parentItemId];
    const subs = await this.itemRepo.findSubstitutionsByParentId(parentItemId);
    for (const sub of subs) {
      groupIds.push(sub.SubstitutionItemId);
    }
    const listClaims = await this.itemRepo.findClaimsByListId(item.ListId);
    const priorInGroup = listClaims.filter(
      (c) => c.UserId === userId && groupIds.includes(c.ItemId) && c.ItemId !== itemId
    );
    if (priorInGroup.length > 0) {
      await this.itemRepo.deleteClaimsAtomic(
        priorInGroup.map((c) => c.ItemId),
        userId
      );
    }

    const claims = await this.itemRepo.findClaimsByItemId(itemId);

    let isMultiCount = item.MultiCount === true;
    let desiredQuantity = item.DesiredQuantity != null ? Number(item.DesiredQuantity) : 1;
    if (!Number.isFinite(desiredQuantity)) {
      desiredQuantity = 1;
    }
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
              desiredQuantity =
                parsed.DesiredQuantity != null ? Number(parsed.DesiredQuantity) : 1;
              if (!Number.isFinite(desiredQuantity)) {
                desiredQuantity = 1;
              }
              variations = parsed.Variations || [];
            }
          }
        }
      } catch (_) {}
    }

    if (isMultiCount) {
      if (desiredQuantity > 0) {
        const totalClaimedQty = claims.reduce((sum, c) => sum + (c.Quantity || 1), 0);
        if (totalClaimedQty + quantity > desiredQuantity) {
          const remaining = Math.max(0, desiredQuantity - totalClaimedQty);
          throw new AppError(`Claim quantity exceeds remaining available items. Remaining: ${remaining}`, 400, 'BAD_REQUEST');
        }
      }

      if (selection) {
        const matchVar = variations.find((v) => v.Name === selection);
        if (matchVar) {
          const rawVarLimit = Number(matchVar.Quantity);
          const varUnlimited = rawVarLimit === 0;
          if (!varUnlimited) {
            const varLimit = Number.isFinite(rawVarLimit) ? rawVarLimit : 0;
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

      // Full target with no prior GF claims → exclusive claim (regular purchase).
      if (totalClaimed === 0 && itemPrice > 0 && isMoneyAmountAtLeast(amount, itemPrice)) {
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

      if (itemPrice > 0 && wouldExceedMoneyTarget(totalClaimed, amount, itemPrice)) {
        const remaining = moneyAmountLeftover(itemPrice, totalClaimed);
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

  /**
   * Side effects for a successful partial group-funding claim (comment + notify).
   * Safe to call after linked atomic inserts for the primary claim only.
   */
  async afterGroupFundContribution(input: {
    claim: Claim;
    priorClaims: Claim[];
    itemId: string;
    listId: string;
    itemName: string;
    listTitle: string;
    ownerUserId: string | null;
  }): Promise<void> {
    const amount = input.claim.Amount != null ? Number(input.claim.Amount) : 0;
    if (!(amount > 0)) {
      return;
    }

    const isStart = !input.priorClaims.some(
      (c) => c.Amount != null && Number(c.Amount) > 0
    );

    if (this.postGroupFundComment) {
      try {
        await this.postGroupFundComment.execute({
          listId: input.listId,
          itemId: input.itemId,
          itemName: input.itemName,
          amount,
          isStart,
        });
      } catch (err) {
        console.error('[GroupFunding] Failed to post auto-comment:', err);
      }
    }

    if (this.notifyGroupFundContributors) {
      try {
        await this.notifyGroupFundContributors.execute({
          priorClaims: input.priorClaims,
          itemId: input.itemId,
          itemName: input.itemName,
          listId: input.listId,
          listTitle: input.listTitle,
          amount,
          isStart,
          actorUserId: input.claim.UserId,
          ownerUserId: input.ownerUserId,
        });
      } catch (err) {
        console.error('[GroupFunding] Failed to notify contributors:', err);
      }
    }
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
    const priorClaims = await this.itemRepo.findClaimsByItemId(itemId);
    const prepared = await this.prepare(
      itemId,
      userId,
      amount,
      claimedByName,
      anonymous,
      quantity,
      selection
    );
    const claim = await this.itemRepo.createClaim(
      prepared.itemId,
      prepared.userId,
      prepared.amount,
      prepared.claimedByName,
      prepared.anonymous,
      prepared.quantity,
      prepared.selection
    );

    const item = await this.itemRepo.findById(itemId);
    if (item) {
      publishListChanged(item.ListId, {
        reason: 'claim.changed',
        itemId,
        actorUserId: userId ?? undefined,
      });

      if (claim.Amount != null && Number(claim.Amount) > 0) {
        const wishlist = await this.wishlistRepo.findById(item.ListId);
        await this.afterGroupFundContribution({
          claim,
          priorClaims,
          itemId,
          listId: item.ListId,
          itemName: item.Name,
          listTitle: wishlist?.Title ?? 'a wishlist',
          ownerUserId: wishlist?.UserId ?? null,
        });
      }
    }

    return claim;
  }
}
