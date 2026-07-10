import type { Item } from './item.entity';
import type { Wishlist } from '@/modules/wishlist/domain/wishlist.entity';
import { WishlistEntity } from '@/modules/wishlist/domain/wishlist.entity';

export interface ItemVisibilityContext {
  item: Item;
  wishlist: Wishlist;
  currentUserId: string | null;
  audienceUserIds: string[];
}

export function parseOtherUsersCanSee(description: string | null): boolean {
  if (!description) return true;
  try {
    if (description.startsWith('{') && description.endsWith('}')) {
      const parsed = JSON.parse(description);
      if (parsed && typeof parsed === 'object' && parsed.otherUsersCanSee === false) {
        return false;
      }
    }
  } catch {
    // Plain text description
  }
  return true;
}

export function isItemSuggestion(item: Item, wishlistOwnerId: string): boolean {
  return Boolean(
    item.IsSuggestion ||
      (item.SuggestedByUserId !== null && item.SuggestedByUserId !== wishlistOwnerId)
  );
}

export function canUserViewItem(ctx: ItemVisibilityContext): boolean {
  const { item, wishlist, currentUserId, audienceUserIds } = ctx;

  if (!currentUserId) {
    return false;
  }

  const wishlistEntity = WishlistEntity.from(wishlist);
  const isOwner = wishlistEntity.isOwner(currentUserId);
  const hasExpired = wishlistEntity.isExpired();
  const isSuggestion = isItemSuggestion(item, wishlist.UserId);
  const otherUsersCanSee = parseOtherUsersCanSee(item.Description);

  const shouldHideSuggestion = isOwner && (!hasExpired || !wishlist.RevealSuggestions);

  if (isOwner && (item.IsHiddenIdea || isSuggestion) && shouldHideSuggestion) {
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
