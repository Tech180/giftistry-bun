import { ITEM_LIST_DISPLAY_TIER } from '../constants/item-list-display-tier.constant';
import type { ItemListDisplayTier } from '../types/item-list-display-tier.type';
import type { SortableWishlistItem } from '../interfaces/sortable-wishlist-item.interface';
import { resolveItemListDisplayFavorite } from './resolve-item-list-display-favorite.util';

export function hasItemListDisplayPriority(
  priority: number | null | undefined
): priority is number {
  return priority !== null && priority !== undefined;
}

export function resolveItemListDisplayTier(item: SortableWishlistItem): ItemListDisplayTier {
  const isFavorite = resolveItemListDisplayFavorite(item);
  const hasPriority = hasItemListDisplayPriority(item.Priority);

  if (isFavorite && hasPriority) {
    return ITEM_LIST_DISPLAY_TIER.favoritedPriority;
  }
  if (hasPriority) {
    return ITEM_LIST_DISPLAY_TIER.priorityOnly;
  }
  if (isFavorite) {
    return ITEM_LIST_DISPLAY_TIER.favoritedOnly;
  }
  return ITEM_LIST_DISPLAY_TIER.neither;
}
