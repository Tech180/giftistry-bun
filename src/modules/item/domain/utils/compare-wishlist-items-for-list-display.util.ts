import { formatCategoryLabel } from './format-category-label.util';
import type { SortableWishlistItem } from '../interfaces/sortable-wishlist-item.interface';
import {
  hasItemListDisplayPriority,
  resolveItemListDisplayTier,
} from './resolve-item-list-display-tier.util';

function compareCategoryFormatted(a: string, b: string): number {
  if (a === 'Uncategorized' && b !== 'Uncategorized') {
    return 1;
  }
  if (a !== 'Uncategorized' && b === 'Uncategorized') {
    return -1;
  }
  return a.localeCompare(b);
}

function comparePriorityValues(
  a: number | null | undefined,
  b: number | null | undefined
): number {
  const aHas = hasItemListDisplayPriority(a);
  const bHas = hasItemListDisplayPriority(b);
  if (aHas && bHas) {
    if (a !== b) {
      return a - b;
    }
    return 0;
  }
  if (aHas && !bHas) {
    return -1;
  }
  if (!aHas && bHas) {
    return 1;
  }
  return 0;
}

export function compareWishlistItemsForListDisplay(
  a: SortableWishlistItem,
  b: SortableWishlistItem
): number {
  const aCategory = formatCategoryLabel(a.Category || 'uncategorized');
  const bCategory = formatCategoryLabel(b.Category || 'uncategorized');
  const catCompare = compareCategoryFormatted(aCategory, bCategory);
  if (catCompare !== 0) {
    return catCompare;
  }

  const tierCompare = resolveItemListDisplayTier(a) - resolveItemListDisplayTier(b);
  if (tierCompare !== 0) {
    return tierCompare;
  }

  const priorityCompare = comparePriorityValues(a.Priority, b.Priority);
  if (priorityCompare !== 0) {
    return priorityCompare;
  }

  const nameCompare = a.Name.localeCompare(b.Name);
  if (nameCompare !== 0) {
    return nameCompare;
  }

  const aId = a.Id ?? '';
  const bId = b.Id ?? '';
  return aId.localeCompare(bId);
}
