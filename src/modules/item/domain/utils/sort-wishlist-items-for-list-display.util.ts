import type { SortableWishlistItem } from '../interfaces/sortable-wishlist-item.interface';
import { compareWishlistItemsForListDisplay } from './compare-wishlist-items-for-list-display.util';

export function sortWishlistItemsForListDisplay<T extends SortableWishlistItem>(
  items: T[]
): T[] {
  return [...items].sort(compareWishlistItemsForListDisplay);
}
