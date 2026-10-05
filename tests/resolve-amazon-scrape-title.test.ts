import { describe, expect, test } from 'bun:test';
import * as cheerio from 'cheerio';
import { resolveAmazonScrapeTitle } from '../src/modules/item/infrastructure/scraping/extractors/utils/resolve-amazon-scrape-title.util';

describe('resolveAmazonScrapeTitle', () => {
  test('prefers #productTitle over meta', () => {
    const html = `<html><head><meta property="og:title" content="Amazon.com" /></head>
      <body><span id="productTitle">Real Product</span></body></html>`;
    const $ = cheerio.load(html);
    expect(resolveAmazonScrapeTitle($)).toBe('Real Product');
  });

  test('falls back to stripped og:title when productTitle missing', () => {
    const html = `<html><head><meta property="og:title" content="Amazon.com: Gadget Pro : Electronics" /></head><body></body></html>`;
    const $ = cheerio.load(html);
    expect(resolveAmazonScrapeTitle($)).toBe('Gadget Pro');
  });

  test('rejects generic meta-only titles', () => {
    const html = `<html><head><title>Amazon.com</title></head><body></body></html>`;
    const $ = cheerio.load(html);
    expect(resolveAmazonScrapeTitle($)).toBeNull();
  });
});
