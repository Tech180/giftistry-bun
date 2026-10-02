import type { FieldMatchResult } from '../interfaces/field-match-result.interface';

const PRICE_EPSILON = 0.01;

export function matchPriceField(
  expected: number | null | undefined,
  actual: number | null | undefined
): FieldMatchResult {
  if (expected == null && actual == null) {
    return { field: 'price', matched: true, expected: null, actual: null };
  }
  if (expected == null || actual == null) {
    return {
      field: 'price',
      matched: false,
      expected: expected ?? null,
      actual: actual ?? null,
      reason: 'missing_side',
    };
  }
  const matched = Math.abs(expected - actual) <= PRICE_EPSILON;
  return {
    field: 'price',
    matched,
    expected,
    actual,
    reason: matched ? undefined : 'price_delta',
  };
}
