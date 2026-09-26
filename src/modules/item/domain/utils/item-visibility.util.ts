import type { Item } from '../interfaces/item.interface';
import { WishlistEntity } from '@/modules/wishlist';
import { ListRole } from '@/common/domain/list-role.vo';
import type { ItemVisibilityContext } from '../interfaces/item-visibility-context.interface';

export function parseOtherUsersCanSee(description: string | null): boolean {
  if (!description) return true;
  try {
    if (description.startsWith('{') && description.endsWith('}')) {
      const parsed = JSON.parse(description);
      if (parsed && typeof parsed === 'object' && parsed.OtherUsersCanSee === false) {
        return false;
      }
    }
  } catch {
    // Plain text description
  }
  return true;
}

export function isItemSuggestion(item: Item, wishlistOwnerId: string): boolean {
  // Explicit false wins (collaborator-created catalog items).
  if (item.IsSuggestion === false) {
    return false;
  }
  return Boolean(
    item.IsSuggestion ||
      (item.SuggestedByUserId !== null && item.SuggestedByUserId !== wishlistOwnerId)
  );
}

function resolveOtherUsersCanSee(item: Item): boolean {
  if (item.OtherUsersCanSee !== undefined && item.OtherUsersCanSee !== null) {
    return item.OtherUsersCanSee !== false;
  }
  return parseOtherUsersCanSee(item.Description);
}

export function canUserViewItem(ctx: ItemVisibilityContext): boolean {
  const { item, wishlist, currentUserId, audienceUserIds } = ctx;
  const isSuggestion = isItemSuggestion(item, wishlist.UserId);

  if (!currentUserId) {
    // Public link guests only see owner catalog items (not suggestions or
    // collaborator-authored rows, even when marked IsSuggestion=false).
    if (isSuggestion) return false;
    if (
      item.SuggestedByUserId != null &&
      item.SuggestedByUserId !== wishlist.UserId
    ) {
      return false;
    }
    if (item.IsHiddenIdea) return false;
    if (audienceUserIds.length > 0) return false;
    return true;
  }

  const wishlistEntity = WishlistEntity.from(wishlist);
  const isOwner = wishlistEntity.isOwner(currentUserId);
  const otherUsersCanSee = resolveOtherUsersCanSee(item);

  if (isOwner && isSuggestion && item.IsHiddenIdea) {
    return false;
  }

  if (!isOwner && isSuggestion && !otherUsersCanSee && item.SuggestedByUserId !== currentUserId) {
    return false;
  }

  if (audienceUserIds.length > 0) {
    const isSuggester = item.SuggestedByUserId === currentUserId;
    const isInAudience = audienceUserIds.includes(currentUserId);
    const isSelfPrivateAudience =
      audienceUserIds.length === 1 &&
      item.SuggestedByUserId !== null &&
      audienceUserIds[0] === item.SuggestedByUserId;

    if (isSelfPrivateAudience) {
      return currentUserId === item.SuggestedByUserId;
    }

    if (!isOwner && !isSuggester && !isInAudience) {
      return false;
    }
  }

  return true;
}

export function canUserMutateItem(ctx: ItemVisibilityContext): boolean {
  const { currentUserId, item, wishlist, listRole } = ctx;
  if (!currentUserId) {
    return false;
  }
  if (!canUserViewItem(ctx)) {
    return false;
  }
  if (WishlistEntity.from(wishlist).isOwner(currentUserId)) {
    return true;
  }
  if (listRole && ListRole.create(listRole).isAtLeast('collaborator')) {
    return true;
  }
  return item.SuggestedByUserId === currentUserId;
}
