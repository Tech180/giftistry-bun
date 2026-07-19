import { parseItemDescription } from './item-description.util';
import { formatCategoryLabel } from './format-category-label.util';

export interface SortableWishlistItem {
  Name: string;
  Category?: string | null;
  Priority?: number | null;
  Description?: string | null;
  Metadata?: {
    IsFavorite?: boolean;
    IsPinned?: boolean;
  } | null;
}

/**
 * Same ordering as wishlist export: category (Uncategorized last) →
 * favorite/pinned → numeric priority (nulls last) → name.
 */
export function sortWishlistItemsByExportOrder<T extends SortableWishlistItem>(items: T[]): T[] {
  return [...items]
    .map((item) => {
      const metadata =
        item.Metadata ??
        parseItemDescription(item.Description).metadata;
      const isFav = !!(metadata?.IsFavorite || metadata?.IsPinned);
      return {
        item,
        isFav,
        categoryFormatted: formatCategoryLabel(item.Category || 'uncategorized'),
      };
    })
    .sort((a, b) => {
      if (a.categoryFormatted === 'Uncategorized' && b.categoryFormatted !== 'Uncategorized') return 1;
      if (a.categoryFormatted !== 'Uncategorized' && b.categoryFormatted === 'Uncategorized') return -1;
      const catCompare = a.categoryFormatted.localeCompare(b.categoryFormatted);
      if (catCompare !== 0) return catCompare;

      if (a.isFav && !b.isFav) return -1;
      if (!a.isFav && b.isFav) return 1;

      const aPri = a.item.Priority !== undefined && a.item.Priority !== null ? a.item.Priority : null;
      const bPri = b.item.Priority !== undefined && b.item.Priority !== null ? b.item.Priority : null;
      if (aPri !== null && bPri !== null) {
        if (aPri !== bPri) return aPri - bPri;
      } else if (aPri !== null && bPri === null) {
        return -1;
      } else if (aPri === null && bPri !== null) {
        return 1;
      }

      return a.item.Name.localeCompare(b.item.Name);
    })
    .map(({ item }) => item);
}
