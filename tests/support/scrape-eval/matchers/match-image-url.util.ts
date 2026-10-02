import type { FieldMatchResult } from '../interfaces/field-match-result.interface';

function imageHost(url: string | null | undefined): string | null {
  if (!url?.trim()) {
    return null;
  }
  try {
    return new URL(url.trim()).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/** Hostname-only comparison (scheme/path/query ignored). */
export function matchImageUrlField(
  expected: string | null | undefined,
  actual: string | null | undefined
): FieldMatchResult {
  const expectedHost = imageHost(expected ?? null);
  const actualHost = imageHost(actual ?? null);
  if (expectedHost == null && actualHost == null) {
    return { field: 'imageUrl', matched: true, expected: null, actual: null };
  }
  if (expectedHost == null || actualHost == null) {
    return {
      field: 'imageUrl',
      matched: false,
      expected: expected ?? null,
      actual: actual ?? null,
      reason: 'missing_host',
    };
  }
  const matched = expectedHost === actualHost;
  return {
    field: 'imageUrl',
    matched,
    expected: expectedHost,
    actual: actualHost,
    reason: matched ? undefined : 'host_mismatch',
  };
}
