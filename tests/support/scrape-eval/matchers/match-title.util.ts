import type { FieldMatchResult } from '../interfaces/field-match-result.interface';
import { TITLE_MATCH_MIN_SCORE, tokenSetSimilarity } from './token-set-similarity.util';

export function matchTitleField(expected: string, actual: string | null | undefined): FieldMatchResult {
  const actualStr = actual?.trim() ?? '';
  const score = tokenSetSimilarity(expected, actualStr);
  return {
    field: 'title',
    matched: score >= TITLE_MATCH_MIN_SCORE,
    score,
    expected,
    actual: actualStr || null,
  };
}
