import { tokenizeTitle } from './tokenize-title.util';

/** Jaccard similarity on title token sets (0–1). */
export function tokenSetSimilarity(expected: string, actual: string): number {
  const a = tokenizeTitle(expected);
  const b = tokenizeTitle(actual);
  if (a.size === 0 && b.size === 0) {
    return 1;
  }
  if (a.size === 0 || b.size === 0) {
    return 0;
  }
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) {
      intersection += 1;
    }
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export const TITLE_MATCH_MIN_SCORE = 0.9;
