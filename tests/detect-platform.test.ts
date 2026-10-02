import { describe, expect, test } from 'bun:test';
import { detectPlatform } from '../src/modules/item/infrastructure/scraping/extractors/utils/detect-platform.util';

describe('detectPlatform', () => {
  test('detects shopify from assets', () => {
    const html = `<html><head></head><body>
      <img src="https://cdn.shopify.com/s/files/1/0000/0001/products/x.jpg" />
    </body></html>`;
    expect(detectPlatform(html)).toBe('shopify');
  });

  test('detects amazon from url host', () => {
    expect(detectPlatform('<html></html>', 'https://www.amazon.com/dp/123')).toBe('amazon');
  });

  test('detects magento generator', () => {
    const html = `<html><head><meta name="generator" content="Magento" /></head><body></body></html>`;
    expect(detectPlatform(html)).toBe('magento');
  });
});
