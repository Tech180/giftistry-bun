import { describe, expect, test } from 'bun:test';
import {
  extractOgSiteName,
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

  test('decodes HTML entities in brand and og:site_name hints', () => {
    expect(
      resolveWebsiteName('https://www.barnesandnoble.com/w/example', {
        ogSiteName: 'Barnes &amp; Noble',
      })
    ).toBe('Barnes & Noble');

    expect(
      resolveWebsiteName('https://www.crazyaarons.com/', {
        brand: "Crazy Aaron&#39;s",
      })
    ).toBe("Crazy Aaron's");
  });

  test('extractOgSiteName decodes entities in meta content', () => {
    const html =
      '<meta property="og:site_name" content="Barnes &amp; Noble" />';
    expect(extractOgSiteName(html)).toBe('Barnes & Noble');
  });
});
