import * as cheerio from 'cheerio';
import { decodeHtmlEntities } from '../html-utils';
import type { MetadataExtractor } from './types';

function getMetaContent($: cheerio.CheerioAPI, selectors: string[]): string {
  for (const selector of selectors) {
    const el = $(selector).first();
    const content = el.attr('content')?.trim();
    if (content) return decodeHtmlEntities(content);
  }
  return '';
}

export function isGenericTitle(title: string): boolean {
  const lowerTitle = title.toLowerCase();
  return (
    !title ||
    lowerTitle === 'amazon' ||
    lowerTitle === 'amazon.com' ||
    lowerTitle === 'robot check' ||
    lowerTitle.includes('captcha') ||
    lowerTitle === 'walmart' ||
    lowerTitle === 'target' ||
    lowerTitle === 'site maintenance' ||
    lowerTitle.includes('something went wrong')
  );
}

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
    const priceVal = priceStr ? Number(priceStr.replace(/[^0-9.]/g, '')) : null;
    const price = priceVal !== null && !Number.isNaN(priceVal) ? priceVal : null;

    const description =
      getMetaContent($, [
        'meta[property="og:description"]',
        'meta[name="description"]',
        'meta[name="twitter:description"]',
      ]) || null;

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
