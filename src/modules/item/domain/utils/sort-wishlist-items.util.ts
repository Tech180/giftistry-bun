import type { SortableWishlistItem } from '../interfaces/sortable-wishlist-item.interface';
import { sortWishlistItemsForListDisplay } from './sort-wishlist-items-for-list-display.util';

/**
 * List, export, and API item ordering: category (Uncategorized last) →
 * favorited+priority → priority → favorited → neither → priority value → name → id.
 */
export function sortWishlistItemsByExportOrder<T extends SortableWishlistItem>(
  items: T[]
): T[] {
  return sortWishlistItemsForListDisplay(items);
}
