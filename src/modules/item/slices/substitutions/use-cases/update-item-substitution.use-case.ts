import type { ItemRepository } from '../../../domain/ports/item.repository';
import type { WishlistRepository } from '@/modules/wishlist';
import type { ListShareRepository } from '@/modules/wishlist';
import type { ItemSubstitutionOption } from '../../../domain/interfaces/item-substitution-option.interface';
import { buildSubstitutionSummaryWithClaimSummary } from '../../../domain/utils/build-substitution-summary-with-claim-summary.util';
import type { CreateSubstitutionPayload } from '../interfaces/create-substitution-payload.interface';
import {
  hasSubstitutionPhotos,
  resolveSubstitutionDescription,
  toSubstitutionMetadataWrite,
} from '../utils/substitution-payload.util';
import { AppError } from '@/common/domain/errors/app-error';
import { assertWishlistMutable } from '@/modules/wishlist';
import type { ListChangedPublisher } from '@/modules/wishlist';
import type { AssertUserCanUseCase } from '@/common/application/use-cases/user-policy.use-cases';
import { actorCanManageListItems } from '../utils/actor-can-manage-list-items.util';

export class UpdateItemSubstitutionUseCase {
  constructor(
    private itemRepo: ItemRepository,
    private wishlistRepo: WishlistRepository,
    private assertUserCan: AssertUserCanUseCase,
    private listShareRepo: ListShareRepository | undefined,
    private listChanged: ListChangedPublisher
  ) {}

  async execute(
    substitutionId: string,
    actorUserId: string,
    payload: CreateSubstitutionPayload
  ): Promise<ItemSubstitutionOption> {
    const name = payload.Name?.trim();
    if (!name) {
      throw new AppError('Substitution name is required', 400, 'BAD_REQUEST');
    }

    const row = await this.itemRepo.findSubstitutionById(substitutionId);
    if (!row) {
      throw new AppError('Substitution not found', 404, 'NOT_FOUND');
    }

    const parent = await this.itemRepo.findById(row.ParentItemId);
    if (!parent) {
      throw new AppError('Parent item not found', 404, 'NOT_FOUND');
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
    const isCreator = row.CreatedByUserId === actorUserId;
    if (!canManage && !isCreator) {
      throw new AppError('Forbidden', 403, 'FORBIDDEN');
    }

    const child = await this.itemRepo.findById(row.SubstitutionItemId);
    if (!child) {
      throw new AppError('Substitution item not found', 404, 'NOT_FOUND');
    }

    if (hasSubstitutionPhotos(payload.Metadata)) {
      await this.assertUserCan.execute(actorUserId, 'CanUploadImages');
    }

    const category =
      payload.Category?.trim() || child.Category || 'uncategorized';
    const priorityId =
      payload.PriorityId !== undefined ? payload.PriorityId : child.PriorityId;
    const priority =
      payload.Priority !== undefined && payload.Priority !== null
        ? Number(payload.Priority)
        : payload.Priority === null
          ? null
          : (child.Priority ?? null);

    const metadataWrite =
      payload.Metadata !== undefined
        ? toSubstitutionMetadataWrite(payload.Metadata)
        : null;

    const isHiddenIdea =
      row.Kind === 'claimer_custom' && payload.IsHiddenIdea !== undefined
        ? payload.IsHiddenIdea === true
        : row.Kind === 'claimer_custom'
          ? undefined
          : false;

    await this.itemRepo.update(
      child.Id,
      name,
      resolveSubstitutionDescription(payload),
      priorityId ?? null,
      category,
      priority,
      payload.Metadata !== undefined ? metadataWrite : undefined,
      isHiddenIdea
    );

    if (payload.LinkUrl !== undefined) {
      await this.itemRepo.deleteLinksByItemId(child.Id);
      if (payload.LinkUrl?.trim()) {
        await this.itemRepo.createLink(
          child.Id,
          payload.LinkUrl.trim(),
          payload.WebsiteName?.trim() || null,
          payload.Price != null ? Number(payload.Price) : null,
          null
        );
      }
    }

    const updated = await this.itemRepo.findById(child.Id);
    if (!updated) {
      throw new AppError('Failed to load substitution item', 500, 'INTERNAL_SERVER_ERROR');
    }
    const links = await this.itemRepo.findLinksByItemId(updated.Id);
    const claims = await this.itemRepo.findClaimsByItemId(updated.Id);

    this.listChanged.publish(parent.ListId, {
      reason: 'item.substitution',
      itemId: parent.Id,
      actorUserId: actorUserId,
    });

    return {
      Id: row.Id,
      Kind: row.Kind,
      SortOrder: row.SortOrder,
      CreatedByUserId: row.CreatedByUserId,
      Item: buildSubstitutionSummaryWithClaimSummary(updated, links, claims, {
        allowGroupFunds: !!wishlist.AllowGroupFunds,
      }),
    };
  }
}
