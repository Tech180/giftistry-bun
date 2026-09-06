import type { ItemRepository } from '../domain/ports/item.repository';
import type { WishlistRepository } from '@/modules/wishlist/domain/ports/wishlist.repository';
import type { ItemSubstitutionOption } from '../domain/item-substitution.entity';
import { buildSubstitutionSummaryWithClaimSummary } from '../domain/build-substitution-summary-with-claim-summary.util';
import { AppError } from '@/common/middlewares/error.middleware';
import { canViewerSeeSubstitutionOption } from './can-viewer-see-substitution-option.util';

export class ListItemSubstitutionsUseCase {
  constructor(
    private itemRepo: ItemRepository,
    private wishlistRepo: WishlistRepository
  ) {}

  async execute(
    parentItemId: string,
    currentUserId?: string | null
  ): Promise<{
    Options: ItemSubstitutionOption[];
    AllowSubstitutions: boolean;
  }> {
    const parent = await this.itemRepo.findById(parentItemId);
    if (!parent) {
      throw new AppError('Item not found', 404, 'NOT_FOUND');
    }
    if (parent.IsSubstitution) {
      throw new AppError('Item is a substitution, not a parent', 400, 'BAD_REQUEST');
    }

    const wishlist = await this.wishlistRepo.findById(parent.ListId);
    if (!wishlist) {
      throw new AppError('Wishlist not found', 404, 'NOT_FOUND');
    }

    const rows = await this.itemRepo.findSubstitutionsByParentId(parentItemId);
    const options: ItemSubstitutionOption[] = [];

    for (const row of rows) {
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
      const links = await this.itemRepo.findLinksByItemId(child.Id);
      const claims = await this.itemRepo.findClaimsByItemId(child.Id);
      options.push({
        Id: row.Id,
        Kind: row.Kind,
        SortOrder: row.SortOrder,
        CreatedByUserId: row.CreatedByUserId,
        Item: buildSubstitutionSummaryWithClaimSummary(child, links, claims, {
          allowGroupFunds: !!wishlist.AllowGroupFunds,
        }),
      });
    }

    return {
      Options: options,
      AllowSubstitutions: parent.AllowSubstitutions !== false,
    };
  }
}
