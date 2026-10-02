import type { FieldMatchResult } from '../interfaces/field-match-result.interface';
import { matchTitleField } from './match-title.util';

export function matchTitleCandidates(
  candidates: string[],
  actual: string | null | undefined
): FieldMatchResult {
  if (candidates.length === 0) {
    return {
      field: 'title',
      matched: true,
      skipped: true,
      reason: 'no_title_expected',
      actual: actual?.trim() || null,
    };
  }

  let best: FieldMatchResult | null = null;
  for (const candidate of candidates) {
    const result = matchTitleField(candidate, actual);
    if (!best || (result.score ?? 0) > (best.score ?? 0)) {
      best = result;
    }
  }
  return best!;
}
