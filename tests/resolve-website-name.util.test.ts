import { describe, expect, test } from 'bun:test';
import {
  resolveWebsiteName,
  resolveWebsiteNameFromUrl,
} from '../src/modules/item/infrastructure/scraping/extractors/resolve-website-name.util';

describe('resolve-website-name.util', () => {
  test('skips generic shop subdomain and uses brand domain', () => {
    expect(resolveWebsiteNameFromUrl('https://shop.ayaneo.com/products/pocket-micro-2')).toBe('Ayaneo');
  });

  test('prefers brand and vendor hints over hostname', () => {
    expect(
      resolveWebsiteName('https://shop.ayaneo.com/products/pocket-micro-2', {
        brand: 'AYANEO',
        vendor: 'AYANEO',
        ogSiteName: 'Shop',
      })
    ).toBe('AYANEO');
  });
});
