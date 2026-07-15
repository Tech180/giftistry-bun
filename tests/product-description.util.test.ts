import { describe, expect, test } from 'bun:test';
import { isUnusableProductDescription, sanitizeProductDescription } from '../src/modules/item/domain/product-description.util';

describe('product-description.util', () => {
  test('rejects customs and notice boilerplate', () => {
    const notice =
      'NOTICE: Final payment does not include taxes and duty fees. If you want to know how much customs will charge you, call the customs office in your country.';

    expect(isUnusableProductDescription(notice)).toBe(true);
    expect(sanitizeProductDescription(notice)).toBeNull();
  });

  test('allows short factual product descriptions', () => {
    const description = 'Compact gaming handheld with high-performance hardware for immersive gaming on the go.';
    expect(isUnusableProductDescription(description)).toBe(false);
    expect(sanitizeProductDescription(description)).toBe(description);
  });
});
