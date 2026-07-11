import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  buildJsonLdPageContext,
  extractJsonLdProductDetails,
  parseSizeFromVariantName,
} from '@/modules/item/infrastructure/scraping/extractors/json-ld-product.util';
import { parseMetadata } from '@/modules/item/infrastructure/scraping/parser';
import { mapScrapeToCustomFields } from '@/modules/item/infrastructure/map-scrape-to-custom-fields';

const FIXTURES = join(import.meta.dir, 'fixtures/scraping');
const LTT_URL = 'https://www.lttstore.com/products/netnoodz-t-shirt?variant=42151262453863';

describe('json-ld product group utilities', () => {
  test('parses size suffix from variant name', () => {
    expect(parseSizeFromVariantName('NetNoodz T-shirt - Small', 'NetNoodz T-shirt')).toBe('Small');
    expect(parseSizeFromVariantName('Classic Hoodie / Large', 'Classic Hoodie')).toBe('Large');
  });

  test('extracts selected Shopify variant size and brand', () => {
    const html = readFileSync(join(FIXTURES, 'ltt-product-group.html'), 'utf8');
    const details = extractJsonLdProductDetails(html, LTT_URL);

    expect(details?.title).toBe('NetNoodz T-shirt');
    expect(details?.brand).toBe('LTTStore');
    expect(details?.selectedVariant?.size).toBe('Small');
    expect(details?.selectedVariant?.price).toBe(34.99);
    expect(details?.variants).toHaveLength(2);
  });

  test('builds rich page context for AI populate', () => {
    const html = readFileSync(join(FIXTURES, 'ltt-product-group.html'), 'utf8');
    const context = buildJsonLdPageContext(html, LTT_URL);

    expect(context).toContain('Brand: LTTStore');
    expect(context).toContain('Selected Size: Small');
    expect(context).toContain('Available Sizes:');
  });
});

describe('LTT Shopify product scrape', () => {
  test('extracts shirt size and brand from ProductGroup JSON-LD', () => {
    const html = readFileSync(join(FIXTURES, 'ltt-product-group.html'), 'utf8').padEnd(600, ' ');
    const metadata = parseMetadata(html, LTT_URL, 'full');

    expect(metadata.title).toBe('NetNoodz T-shirt');
    expect(metadata.size).toBe('Small');
    expect(metadata.price).toBe(34.99);

    const mapped = mapScrapeToCustomFields(metadata, LTT_URL);
    expect(mapped.predefinedFields.ShirtSize).toBe('Small');
  });
});
