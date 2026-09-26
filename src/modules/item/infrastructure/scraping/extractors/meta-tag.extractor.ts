import * as cheerio from 'cheerio';
import { sanitizeProductDescription } from '../../../domain/utils/product-description.util';
import { decodeHtmlEntities } from '../utils/html.util';
import type { MetadataExtractor } from './interfaces/metadata-extractor.interface';
import { getMetaContent } from './utils/get-meta-content.util';
import { parseScrapePrice } from './utils/parse-scrape-price.util';

export const metaTagExtractor: MetadataExtractor = {
  name: 'meta-tag',
  priority: 30,
  extract({ html, mode }) {
    const $ = cheerio.load(html);

    let title =
      getMetaContent($, ['meta[property="og:title"]', 'meta[name="twitter:title"]']) || '';

    if (!title) {
      const h1 = $('h1').first().text().trim();
      title = h1 || $('title').first().text().trim();
    }
    title = decodeHtmlEntities(title);

    const priceStr =
      getMetaContent($, [
        'meta[property="product:price:amount"]',
        'meta[property="og:price:amount"]',
        '[itemprop="price"]',
      ]) || $('[itemprop="price"]').first().text().trim();
    const price = parseScrapePrice(priceStr);

    const description = sanitizeProductDescription(
      getMetaContent($, [
        'meta[property="og:description"]',
        'meta[name="description"]',
        'meta[name="twitter:description"]',
      ]) || null
    );

    const imageUrl = getMetaContent($, ['meta[property="og:image"]']) || null;

    const result: ReturnType<MetadataExtractor['extract']> = {
      title: title || null,
      price,
      description: description || null,
      imageUrl: imageUrl || null,
    };

    if (mode === 'full') {
      const colorMeta = getMetaContent($, [
        'meta[property="product:color"]',
        'meta[name="color"]',
        '[itemprop="color"]',
      ]);
      const sizeMeta = getMetaContent($, [
        'meta[property="product:size"]',
        'meta[name="size"]',
        '[itemprop="size"]',
      ]);
      result.color = colorMeta || null;
      result.size = sizeMeta || null;
    }

    return result;
  },
};
