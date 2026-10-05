import type { CheerioAPI } from 'cheerio';

export function resolveAmazonProductTitleFromDom($: CheerioAPI): string | null {
  const productTitle = $('#productTitle').first().text().replace(/\s+/g, ' ').trim();
  return productTitle || null;
}
