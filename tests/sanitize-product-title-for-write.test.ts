import { describe, expect, test } from 'bun:test';
import { sanitizeProductTitleForWrite } from '../src/modules/item/domain/utils/sanitize-product-title-for-write.util';

describe('sanitizeProductTitleForWrite', () => {
  test('returns null for bare Amazon shell titles', () => {
    expect(sanitizeProductTitleForWrite('Amazon')).toBeNull();
    expect(sanitizeProductTitleForWrite('amazon.com')).toBeNull();
  });

  test('strips SEO wrapper then keeps product name', () => {
    expect(sanitizeProductTitleForWrite('Amazon.com: Travel Mug : Kitchen')).toBe('Travel Mug');
  });

  test('keeps normal product titles', () => {
    expect(sanitizeProductTitleForWrite('Ceramic Vase')).toBe('Ceramic Vase');
  });
});
