import { normalizeCategoryLabel } from './normalize-category-label.util';

/**
 * Categories treated as unassigned / generic for import "optimize categories" OFF.
 * Soft categories may still receive AI assignment; locked ones are preserved.
 */
export function isSoftImportCategory(category: string | null | undefined): boolean {
  if (category == null) return true;
  const trimmed = String(category).trim();
  if (!trimmed) return true;

  const lower = trimmed.toLowerCase();
  if (lower === 'uncategorized' || lower === 'general' || lower === 'general items') {
    return true;
  }

  const normalized = normalizeCategoryLabel(trimmed);
  return (
    normalized === 'uncategorized' ||
    normalized === 'general' ||
    normalized === 'general_items'
  );
}

export function isLockedImportCategory(category: string | null | undefined): boolean {
  return !isSoftImportCategory(category);
}

/**
 * When optimize is off and the source category is locked, keep the source category.
 * Otherwise prefer the proposed (AI/scrape) category when non-empty.
 */
export function resolveImportCategoryWithOptimize(
  sourceCategory: string | null | undefined,
  proposedCategory: string | null | undefined,
  optimizeCategories: boolean
): string | null | undefined {
  if (!optimizeCategories && isLockedImportCategory(sourceCategory)) {
    return sourceCategory;
  }
  const proposed = typeof proposedCategory === 'string' ? proposedCategory.trim() : '';
  if (proposed) return proposedCategory;
  return sourceCategory;
}
