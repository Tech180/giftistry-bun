import { describe, expect, test } from 'bun:test';
import { matchImageHostField } from './match-image-host.util';
import { matchPriceField } from './match-price.util';
import { matchTitleField } from './match-title.util';
import { tokenSetSimilarity } from './token-set-similarity.util';

describe('scrape-eval matchers', () => {
  test('token-set title similarity', () => {
    expect(tokenSetSimilarity('Wireless Bluetooth Headphones', 'Bluetooth Headphones Wireless')).toBe(1);
    expect(tokenSetSimilarity('Next.js Running Shoes', 'Running Shoes Next.js')).toBe(1);
  });

  test('price within one cent', () => {
    expect(matchPriceField(18, 18.009).matched).toBe(true);
    expect(matchPriceField(18, 18.02).matched).toBe(false);
  });

  test('image host-only match', () => {
    expect(matchImageHostField('cdn.shopify.com', 'https://cdn.shopify.com/mug.jpg').matched).toBe(true);
    expect(matchImageHostField('cdn.shopify.com', 'https://other.example/mug.jpg').matched).toBe(false);
  });

  test('title match threshold', () => {
    expect(matchTitleField('Handmade Ceramic Mug', 'Handmade Ceramic Mug').matched).toBe(true);
  });
});
