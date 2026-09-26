import type { CategoryClassificationResult } from '../../domain/interfaces/category-classification-result.interface';
import { normalizeCategoryLabel } from '../../domain/utils/normalize-category-label.util';

export function parseCategoryAlternatives(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];

  const seen = new Set<string>();
  const alternatives: string[] = [];

  for (const entry of raw) {
    if (typeof entry !== 'string') continue;
    const normalized = normalizeCategoryLabel(entry);
    if (normalized === 'uncategorized' || seen.has(normalized)) continue;
    seen.add(normalized);
    alternatives.push(normalized);
    if (alternatives.length >= 2) break;
  }

  return alternatives;
}

export function parseCategoryJson(text: string): CategoryClassificationResult {
  let clean = text.trim();
  if (clean.startsWith('```')) {
    clean = clean.replace(/^```(json)?/i, '');
    clean = clean.replace(/```$/, '');
    clean = clean.trim();
  }

  const parsed = JSON.parse(clean) as Record<string, unknown>;
  const category =
    typeof parsed.Category === 'string'
      ? normalizeCategoryLabel(parsed.Category)
      : 'uncategorized';
  const alternatives = parseCategoryAlternatives(parsed.Alternatives).filter(
    (alt) => alt !== category
  );

  return { category, alternatives };
}
