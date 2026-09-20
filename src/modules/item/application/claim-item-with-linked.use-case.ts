import type { Claim } from '../domain/item.entity';
import type { ClaimItemUseCase } from './claim-item.use-case';
import type { ItemRepository } from '../domain/ports/item.repository';
import type { CreateClaimInput } from '../domain/ports/item.repository';
import type { WishlistRepository } from '@/modules/wishlist/domain/ports/wishlist.repository';
import type { AssertItemVisibleUseCase } from './assert-item-visible.use-case';
import { AppError } from '@/common/middlewares/error.middleware';
import { resolveItemMetadata } from '../domain/resolve-item-metadata.util';
import type { ListChangedPublisher } from '@/modules/wishlist/domain/ports/list-changed-publisher.port';

export interface ClaimWithLinkedInput {
  amount: number | null;
  claimedByName: string | null;
  anonymous: boolean;
  quantity: number;
  selection: string | null;
  includeLinked: boolean;
}

export class ClaimItemWithLinkedUseCase {
  constructor(
    private itemRepo: ItemRepository,
    private claimItem: ClaimItemUseCase,
    private assertItemVisible: AssertItemVisibleUseCase,
    private wishlistRepo: WishlistRepository | undefined,
    private listChanged: ListChangedPublisher
  ) {}

  async execute(
    itemId: string,
    userId: string,
    input: ClaimWithLinkedInput
  ): Promise<Claim[]> {
    await this.assertItemVisible.execute(itemId, userId);

    const primary = await this.itemRepo.findById(itemId);
    if (!primary) {
      throw new AppError('Item not found', 404, 'NOT_FOUND');
    }

    const priorClaims = await this.itemRepo.findClaimsByItemId(itemId);

    const prepared: CreateClaimInput[] = [
      await this.claimItem.prepare(
        itemId,
        userId,
        input.amount,
        input.claimedByName,
        input.anonymous,
        input.quantity,
        input.selection
      ),
    ];

    if (input.includeLinked) {
      const metadata = resolveItemMetadata(primary);
      const linkedIds = metadata?.LinkedItemIds ?? primary.LinkedItemIds ?? [];
      if (linkedIds.length > 0) {
        const wishlistItems = await this.itemRepo.findByListId(primary.ListId);

        for (const linkedId of linkedIds) {
          if (linkedId === itemId) continue;
          const linked = wishlistItems.find((item) => item.Id === linkedId);
          if (!linked) continue;

          const existingClaims = await this.itemRepo.findClaimsByItemId(linkedId);
          if (existingClaims.length > 0) continue;

          prepared.push(
            await this.claimItem.prepare(
              linkedId,
              userId,
              null,
              input.claimedByName,
              input.anonymous,
              1,
              null
            )
          );
        }
      }
    }

    const claims = await this.itemRepo.createClaimsAtomic(prepared);
    this.listChanged.publish(primary.ListId, {
      reason: 'claim.changed',
      itemId,
      actorUserId: userId,
    });

    const primaryClaim = claims.find((c) => c.ItemId === itemId) ?? claims[0];
    if (primaryClaim && primaryClaim.Amount != null && Number(primaryClaim.Amount) > 0) {
      const wishlist = this.wishlistRepo
        ? await this.wishlistRepo.findById(primary.ListId)
        : null;
      await this.claimItem.afterGroupFundContribution({
        claim: primaryClaim,
        priorClaims,
        itemId,
        listId: primary.ListId,
        itemName: primary.Name,
        listTitle: wishlist?.Title ?? 'a wishlist',
        ownerUserId: wishlist?.UserId ?? null,
      });
    }

    return claims;
  }
}
