import type { SortableWishlistItem } from '../interfaces/sortable-wishlist-item.interface';
import { parseItemDescription } from './item-description.util';

export function resolveItemListDisplayFavorite(item: SortableWishlistItem): boolean {
  if (item.IsFavorite === true) {
    return true;
  }
  const metadata =
    item.Metadata ?? parseItemDescription(item.Description).metadata;
  return metadata?.IsFavorite === true;
}
