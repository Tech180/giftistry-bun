import type { ItemRepository } from '../domain/ports/item.repository';
import type { WishlistRepository } from '@/modules/wishlist/domain/ports/wishlist.repository';
import type { ItemSubstitutionOption } from '../domain/item-substitution.entity';
import { toSubstitutionSummary } from '../domain/item-substitution.entity';
import type { CreateSubstitutionPayload } from './substitution-payload.util';
import {
  hasSubstitutionPhotos,
  resolveSubstitutionDescription,
  toSubstitutionMetadataWrite,
} from './substitution-payload.util';
import { AppError } from '@/common/middlewares/error.middleware';
import { assertWishlistMutable } from '@/modules/wishlist/domain/assert-wishlist-mutable.util';
import { publishListChanged } from '@/modules/wishlist/infrastructure/wishlist-list-publisher';
import type { AssertUserCanUseCase } from '@/common/application/user-policy.use-cases';

export class UpdateItemSubstitutionUseCase {
  constructor(
    private itemRepo: ItemRepository,
    private wishlistRepo: WishlistRepository,
    private assertUserCan: AssertUserCanUseCase
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

    const isOwner = wishlist.UserId === actorUserId;
    const isCreator = row.CreatedByUserId === actorUserId;
    if (!isOwner && !isCreator) {
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

    publishListChanged(parent.ListId, {
      reason: 'item.substitution',
      itemId: parent.Id,
      actorUserId: actorUserId,
    });

    return {
      Id: row.Id,
      Kind: row.Kind,
      SortOrder: row.SortOrder,
      CreatedByUserId: row.CreatedByUserId,
      Item: toSubstitutionSummary(updated, links, claims),
    };
  }
}
