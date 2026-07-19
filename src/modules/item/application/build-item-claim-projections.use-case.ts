import type { ItemRepository } from '../domain/ports/item.repository';
import type { WishlistRepository } from '@/modules/wishlist/domain/ports/wishlist.repository';
import type { ItemClaimMutationProjection } from '../domain/item-claim-mutation-projection';
import { computeItemClaimSummary } from '../domain/compute-item-claim-summary.util';
import { resolveItemMetadata } from '../domain/resolve-item-metadata.util';
import type { Claim } from '../domain/item.entity';

function redactClaimsForViewer(claims: Claim[], currentUserId: string | null): Claim[] {
  return claims.map((c) => {
    if (c.Anonymous && c.UserId !== currentUserId) {
      return {
        ...c,
        UserId: null,
        ClaimedByName: 'Anonymous',
      };
    }
    return c;
  });
}

export class BuildItemClaimProjectionsUseCase {
  constructor(
    private itemRepo: ItemRepository,
    private wishlistRepo: WishlistRepository
  ) {}

  async execute(
    itemIds: string[],
    currentUserId: string | null
  ): Promise<ItemClaimMutationProjection[]> {
    const uniqueIds = [...new Set(itemIds.filter(Boolean))];
    const projections: ItemClaimMutationProjection[] = [];

    for (const itemId of uniqueIds) {
      const item = await this.itemRepo.findById(itemId);
      if (!item) continue;

      const wishlist = await this.wishlistRepo.findById(item.ListId);
      if (!wishlist) continue;

      const [links, claims] = await Promise.all([
        this.itemRepo.findLinksByItemId(itemId),
        this.itemRepo.findClaimsByItemId(itemId),
      ]);

      const metadata = resolveItemMetadata(item);
      const claimSummary = computeItemClaimSummary({
        description: item.Description,
        metadata,
        claims,
        links,
        allowGroupFunds: !!wishlist.AllowGroupFunds,
        hideClaims: false,
      });

      projections.push({
        Id: itemId,
        Claims: redactClaimsForViewer(claims, currentUserId),
        IsClaimed: claims.length > 0,
        ...claimSummary,
      });
    }

    return projections;
  }
}
