import type { WishlistExportItem } from '../interfaces/wishlist-export-item.interface';

export function groupExportItemsByCategory(
  items: WishlistExportItem[]
): { categories: string[]; categoryGroups: Record<string, WishlistExportItem[]> } {
  const categoryGroups: Record<string, WishlistExportItem[]> = {};
  for (const item of items) {
    const groupKey = item.categoryFormatted ?? '';
    const group = categoryGroups[groupKey] ?? [];
    group.push(item);
    categoryGroups[groupKey] = group;
  }

  const categories = Object.keys(categoryGroups).sort((a, b) => {
    if (a === 'Uncategorized') return 1;
    if (b === 'Uncategorized') return -1;
    return a.localeCompare(b);
  });

  return { categories, categoryGroups };
}
