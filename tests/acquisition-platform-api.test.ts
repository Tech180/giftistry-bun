import { describe, expect, test } from 'bun:test';
import { PlatformApiStrategy } from '../src/modules/item/infrastructure/scraping/acquisition/platform-api.strategy';

describe('PlatformApiStrategy', () => {
  const strategy = new PlatformApiStrategy();

  test('canHandle Shopify product URLs', () => {
    expect(strategy.canHandle('https://demo.myshopify.com/products/hand-thrown-mug')).toBe(true);
    expect(strategy.canHandle('https://demo.myshopify.com/collections/all')).toBe(false);
    expect(strategy.canHandle('https://example.com/products/widget')).toBe(true);
  });
});
