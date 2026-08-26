import type { ItemRepository } from '../domain/ports/item.repository';
import type { WishlistRepository } from '@/modules/wishlist/domain/ports/wishlist.repository';
import type { ItemSubstitutionOption } from '../domain/item-substitution.entity';
import { toSubstitutionSummary } from '../domain/item-substitution.entity';
import type { CreateSubstitutionPayload } from './substitution-payload.util';
import {
  hasSubstitutionPhotos,
  resolveClaimerSubstitutionHidden,
  resolveSubstitutionDescription,
  toSubstitutionMetadataWrite,
} from './substitution-payload.util';
import { AppError } from '@/common/middlewares/error.middleware';
import { isItemSuggestion } from '../domain/item-visibility.service';
import { assertWishlistMutable } from '@/modules/wishlist/domain/assert-wishlist-mutable.util';
import { publishListChanged } from '@/modules/wishlist/infrastructure/wishlist-list-publisher';
import type { AssertUserCanUseCase } from '@/common/application/user-policy.use-cases';

export class CreateClaimerSubstitutionUseCase {
  constructor(
    private itemRepo: ItemRepository,
    private wishlistRepo: WishlistRepository,
    private assertUserCan: AssertUserCanUseCase
  ) {}

  async execute(
    parentItemId: string,
    actorUserId: string,
    payload: CreateSubstitutionPayload
  ): Promise<ItemSubstitutionOption> {
    const name = payload.Name?.trim();
    if (!name) {
      throw new AppError('Substitution name is required', 400, 'BAD_REQUEST');
    }

    const parent = await this.itemRepo.findById(parentItemId);
    if (!parent) {
      throw new AppError('Item not found', 404, 'NOT_FOUND');
    }
    if (parent.IsSubstitution) {
      throw new AppError('Cannot add substitutions to a substitution item', 400, 'BAD_REQUEST');
    }

    const wishlist = await this.wishlistRepo.findById(parent.ListId);
    if (!wishlist) {
      throw new AppError('Wishlist not found', 404, 'NOT_FOUND');
    }
    assertWishlistMutable(wishlist);

    if (wishlist.UserId === actorUserId) {
      throw new AppError(
        'List owners should use owner-approved substitutions',
        400,
        'BAD_REQUEST'
      );
    }
    if (isItemSuggestion(parent, wishlist.UserId)) {
      throw new AppError('Suggestions cannot have substitutions', 400, 'BAD_REQUEST');
    }

    if (await this.itemRepo.hasClaimerCustomSubstitution(parentItemId)) {
      throw new AppError(
        'This item already has a custom substitution',
        409,
        'CONFLICT'
      );
    }

    if (hasSubstitutionPhotos(payload.Metadata)) {
      await this.assertUserCan.execute(actorUserId, 'CanUploadImages');
    }

    const metadataWrite = toSubstitutionMetadataWrite(payload.Metadata);
    const category =
      payload.Category?.trim() || parent.Category || 'uncategorized';

    const row = await this.itemRepo.createSubstitution({
      listId: parent.ListId,
      parentItemId,
      name,
      description: resolveSubstitutionDescription(payload),
      createdByUserId: actorUserId,
      kind: 'claimer_custom',
      sortOrder: 0,
      category,
      priorityId: payload.PriorityId ?? null,
      priority:
        payload.Priority !== undefined && payload.Priority !== null
          ? Number(payload.Priority)
          : null,
      isHiddenIdea: resolveClaimerSubstitutionHidden('claimer_custom', payload.IsHiddenIdea),
      metadata: metadataWrite,
    });

    if (payload.LinkUrl?.trim()) {
      await this.itemRepo.createLink(
        row.SubstitutionItemId,
        payload.LinkUrl.trim(),
        payload.WebsiteName?.trim() || null,
        payload.Price != null ? Number(payload.Price) : null,
        null
      );
    }

    const child = await this.itemRepo.findById(row.SubstitutionItemId);
    if (!child) {
      throw new AppError('Failed to load substitution item', 500, 'INTERNAL_SERVER_ERROR');
    }
    const links = await this.itemRepo.findLinksByItemId(child.Id);
    const claims = await this.itemRepo.findClaimsByItemId(child.Id);

    publishListChanged(parent.ListId, {
      reason: 'item.substitution',
      itemId: parentItemId,
      actorUserId: actorUserId,
    });

    return {
      Id: row.Id,
      Kind: row.Kind,
      SortOrder: row.SortOrder,
      CreatedByUserId: row.CreatedByUserId,
      Item: toSubstitutionSummary(child, links, claims),
    };
  }
}
