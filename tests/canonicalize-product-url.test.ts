import { describe, expect, test } from 'bun:test';
import { canonicalizeProductUrl } from '../src/modules/item/domain/utils/canonicalize-product-url.util';

describe('canonicalizeProductUrl', () => {
  test('strips tracking params and keeps variant selection', () => {
    const input =
      'https://shop.example.com/products/mug?utm_source=newsletter&gclid=abc&variant=123&size=L&color=red';
    expect(canonicalizeProductUrl(input)).toBe(
      'https://shop.example.com/products/mug?variant=123&size=L&color=red'
    );
  });

  test('removes fbclid and hash', () => {
    const input = 'https://shop.example.com/products/mug?fbclid=xyz#reviews';
    expect(canonicalizeProductUrl(input)).toBe('https://shop.example.com/products/mug');
  });
});
