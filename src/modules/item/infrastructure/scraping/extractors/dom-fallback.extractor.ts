import * as cheerio from 'cheerio';
import { decodeHtmlEntities } from '../html-utils';
import type { MetadataExtractor } from './types';

function parsePriceText(text: string): number | null {
  const parsed = Number(text.replace(/[^0-9.]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

export const domFallbackExtractor: MetadataExtractor = {
  name: 'dom-fallback',
  priority: 20,
  extract({ html, mode }) {
    const $ = cheerio.load(html);

    const title =
      $('[data-test="product-title"]').first().text().trim() ||
      $('[data-testid="product-title"]').first().text().trim() ||
      $('h1').first().text().trim() ||
      null;
    const decodedTitle = title ? decodeHtmlEntities(title) : null;

    const priceText =
      $('[data-test="product-price"]').first().text().trim() ||
      $('[data-testid="product-price"]').first().text().trim() ||
      $('[class*="Price"]').first().text().trim() ||
      $('.price').first().text().trim() ||
      $('[itemprop="price"]').first().text().trim() ||
      $('[itemprop="price"]').first().attr('content')?.trim() ||
      '';
    const price = priceText ? parsePriceText(priceText) : null;

    const imageUrl =
      $('[itemprop="image"]').first().attr('src') ||
      $('[itemprop="image"]').first().attr('content') ||
      $('img.product-image').first().attr('src') ||
      null;

    const result: ReturnType<MetadataExtractor['extract']> = {
      title: decodedTitle,
      price,
      imageUrl: imageUrl || null,
    };

    if (mode === 'full') {
      result.description =
        $('[data-test="product-description"]').first().text().trim() ||
        $('[itemprop="description"]').first().text().trim() ||
        null;
    }

    return result;
  },
};
