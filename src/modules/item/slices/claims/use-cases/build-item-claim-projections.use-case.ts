import type { ItemRepository } from '../../../domain/ports/item.repository';
import type { WishlistRepository } from '@/modules/wishlist';
import type { ItemClaimMutationProjection } from '../../../domain/interfaces/item-claim-mutation-projection.interface';
import { computeItemClaimSummary } from '../../../domain/utils/compute-item-claim-summary.util';
import { resolveItemMetadata } from '../../../domain/utils/resolve-item-metadata.util';
import { redactClaimsForViewer } from '../../../domain/utils/redact-claims-for-viewer.util';

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
