import { STANDARD_CATEGORIES } from './standard-categories';
import { normalizeCategoryLabel } from './normalize-category-label.util';

/**
 * Canonicalize a proposed category against this list's existing labels, then standards.
 * Prefer an existing list string verbatim when normalized forms match.
 */
export function resolveItemCategory(
  proposed: string | null | undefined,
  existingCategories: string[] = []
): string {
  const normalized = normalizeCategoryLabel(proposed || '');
  if (normalized === 'uncategorized') return 'uncategorized';

  for (const existing of existingCategories) {
    if (!existing?.trim() || existing === 'uncategorized') continue;
    if (normalizeCategoryLabel(existing) === normalized) {
      return existing;
    }
  }

  for (const std of STANDARD_CATEGORIES) {
    if (std.id === normalized) return std.id;
    if (normalizeCategoryLabel(std.label) === normalized) return std.id;
  }

  return normalized;
}

export function resolveCategoryAlternatives(
  alternatives: string[] | null | undefined,
  primary: string,
  existingCategories: string[] = []
): string[] {
  if (!alternatives?.length) return [];
  const primaryNorm = normalizeCategoryLabel(primary);
  const seen = new Set<string>([primaryNorm]);
  const out: string[] = [];

  for (const alt of alternatives) {
    const resolved = resolveItemCategory(alt, existingCategories);
    const norm = normalizeCategoryLabel(resolved);
    if (norm === 'uncategorized' || seen.has(norm)) continue;
    seen.add(norm);
    out.push(resolved);
    if (out.length >= 2) break;
  }

  return out;
}
