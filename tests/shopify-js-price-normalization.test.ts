import { describe, expect, test } from 'bun:test';
import { normalizeShopifyProductJsPrices } from '../src/modules/item/infrastructure/scraping/acquisition/utils/normalize-shopify-product-js-prices.util';
import { wrapShopifyProductJson } from '../src/modules/item/infrastructure/scraping/acquisition/utils/wrap-shopify-product-json.util';
import { extractMetadata } from '../src/modules/item/infrastructure/scraping/extractors/extraction-pipeline';

const URL = 'https://serverpartdeals.com/products/toshiba-mg07-14tb-refurbished-hdd';

const productJs = {
  id: 1,
  title: 'Toshiba 14TB MG07 MG07ACA14TEY 7.2K RPM SATA 6Gb/s 512e SIE 3.5in Refurbished HDD',
  vendor: 'Toshiba',
  description: '<p>14TB capacity in a 3.5-inch form factor with a SATA 6Gb/s interface.</p>',
  price: 33900,
  price_min: 33900,
  price_max: 41900,
  compare_at_price: 39900,
  featured_image: 'https://cdn.shopify.com/s/files/1/hdd.jpg',
  variants: [
    { id: 11, title: 'Seller Refurbished', price: 33900, compare_at_price: 39900 },
    { id: 12, title: 'New', price: 41900, compare_at_price: null },
  ],
};

describe('normalizeShopifyProductJsPrices', () => {
  test('converts cents to currency units on product and variants', () => {
    const normalized = normalizeShopifyProductJsPrices(productJs) as typeof productJs;

    expect(normalized.price).toBe(339);
    expect(normalized.price_min).toBe(339);
    expect(normalized.price_max).toBe(419);
    expect(normalized.compare_at_price).toBe(399);
    expect(normalized.variants[0]?.price).toBe(339);
    expect(normalized.variants[0]?.compare_at_price).toBe(399);
    expect(normalized.variants[1]?.price).toBe(419);
    expect(normalized.variants[1]?.compare_at_price).toBeNull();
  });

  test('does not mutate the input and leaves unrelated numeric fields alone', () => {
    const normalized = normalizeShopifyProductJsPrices(productJs) as typeof productJs;
    expect(productJs.price).toBe(33900);
    expect(normalized.id).toBe(1);
  });

  test('passes non-object payloads through', () => {
    expect(normalizeShopifyProductJsPrices(null)).toBeNull();
    expect(normalizeShopifyProductJsPrices([1, 2])).toEqual([1, 2]);
  });

  test('extracted scrape price is dollars, not cents', () => {
    const normalized = normalizeShopifyProductJsPrices(productJs);
    const html = wrapShopifyProductJson(JSON.stringify(normalized), URL);
    const extraction = extractMetadata({
      html,
      url: URL,
      mode: 'full',
      capturedJson: [normalized],
    });

    expect(extraction.metadata.price).toBe(339);
  });
});
