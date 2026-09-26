import type { ItemRepository } from '../../../domain/ports/item.repository';
import type { WishlistRepository } from '@/modules/wishlist';
import type { ListShareRepository } from '@/modules/wishlist';
import type { ItemSubstitutionOption } from '../../../domain/interfaces/item-substitution-option.interface';
import { buildSubstitutionSummaryWithClaimSummary } from '../../../domain/utils/build-substitution-summary-with-claim-summary.util';
import type { CreateSubstitutionPayload } from '../interfaces/create-substitution-payload.interface';
import {
  hasSubstitutionPhotos,
  resolveClaimerSubstitutionHidden,
  resolveSubstitutionDescription,
  toSubstitutionMetadataWrite,
} from '../utils/substitution-payload.util';
import { AppError } from '@/common/domain/errors/app-error';
import { isItemSuggestion } from '../../../domain/utils/item-visibility.util';
import { assertWishlistMutable } from '@/modules/wishlist';
import type { ListChangedPublisher } from '@/modules/wishlist';
import type { AssertUserCanUseCase } from '@/common/application/use-cases/user-policy.use-cases';
import { actorCanManageListItems } from '../utils/actor-can-manage-list-items.util';

export class CreateClaimerSubstitutionUseCase {
  constructor(
    private itemRepo: ItemRepository,
    private wishlistRepo: WishlistRepository,
    private assertUserCan: AssertUserCanUseCase,
    private listShareRepo: ListShareRepository | undefined,
    private listChanged: ListChangedPublisher
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

    const canManage = await actorCanManageListItems(
      wishlist.UserId,
      wishlist.Id,
      actorUserId,
      this.listShareRepo
    );
    if (canManage) {
      throw new AppError(
        'List editors should use owner-approved substitutions',
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

    this.listChanged.publish(parent.ListId, {
      reason: 'item.substitution',
      itemId: parentItemId,
      actorUserId: actorUserId,
    });

    return {
      Id: row.Id,
      Kind: row.Kind,
      SortOrder: row.SortOrder,
      CreatedByUserId: row.CreatedByUserId,
      Item: buildSubstitutionSummaryWithClaimSummary(child, links, claims, {
        allowGroupFunds: !!wishlist.AllowGroupFunds,
      }),
    };
  }
}
