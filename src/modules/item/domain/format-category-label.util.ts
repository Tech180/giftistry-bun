import { STANDARD_CATEGORIES } from './standard-categories';
import { normalizeCategoryLabel } from './normalize-category-label.util';

export function formatCategoryLabel(category: string): string {
  const normalized = normalizeCategoryLabel(category || 'uncategorized');
  const std = STANDARD_CATEGORIES.find((s) => s.id === normalized);
  if (std) return std.label;
  if (!category || normalized === 'uncategorized') return 'Uncategorized';
  return normalized
    .split(/[_-]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export function resolveCategoryPresentation(category: string | null | undefined): {
  CategoryKey: string;
  CategoryLabel: string;
} {
  const raw = category && category.trim() ? category.trim() : 'uncategorized';
  const CategoryKey = normalizeCategoryLabel(raw);
  const CategoryLabel =
    CategoryKey === 'uncategorized' ? 'General Items' : formatCategoryLabel(raw);
  return { CategoryKey, CategoryLabel };
}
