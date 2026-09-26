import { formatCategoryLabel, parseItemDescription, sortWishlistItemsByExportOrder } from '@/modules/item';
import type { WishlistExportItem } from '../interfaces/wishlist-export-item.interface';

export function getSortedItemsWithPriority(items: WishlistExportItem[]): WishlistExportItem[] {
  return sortWishlistItemsByExportOrder(
    items.map((item) => ({
      ...item,
      // Prefer list DTO Metadata (includes Linked/Related from first-class columns).
      // Description is often plain text after list-items resolution.
      Metadata: item.Metadata ?? parseItemDescription(item.Description).metadata,
    }))
  ).map((item) => ({
    ...item,
    categoryFormatted: formatCategoryLabel(item.Category || 'uncategorized'),
    isFav: !!(
      item.IsFavorite ||
      item.IsPinned ||
      item.Metadata?.IsFavorite ||
      item.Metadata?.IsPinned
    ),
  }));
}
