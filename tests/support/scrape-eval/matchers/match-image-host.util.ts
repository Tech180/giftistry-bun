import type { FieldMatchResult } from '../interfaces/field-match-result.interface';
import { matchImageUrlField } from './match-image-url.util';

export function matchImageHostField(
  expectedHost: string | null | undefined,
  actualImageUrl: string | null | undefined
): FieldMatchResult {
  if (expectedHost == null || expectedHost.trim() === '') {
    return {
      field: 'imageUrl',
      matched: true,
      skipped: true,
      reason: 'no_image_expected',
      actual: actualImageUrl ?? null,
    };
  }
  const normalizedExpected = expectedHost.trim().toLowerCase();
  const syntheticExpected = `https://${normalizedExpected}/asset.jpg`;
  const result = matchImageUrlField(syntheticExpected, actualImageUrl);
  return {
    ...result,
    expected: normalizedExpected,
    actual: result.actual,
  };
}
