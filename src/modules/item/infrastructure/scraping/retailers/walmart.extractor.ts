import * as cheerio from 'cheerio';
import { extractFromCapturedJson } from '../extractors/utils/embedded-json.util';
import { parseScrapePrice } from '../extractors/utils/parse-scrape-price.util';
import type { RetailerExtractor } from './interfaces/retailer-extractor.interface';

export const walmartExtractor: RetailerExtractor = {
  hostnames: ['walmart.com'],
  priority: 60,
  extract({ html, mode, capturedJson = [] }) {
    const $ = cheerio.load(html);
    const title = $('h1').first().text().trim() || $('[itemprop="name"]').first().text().trim() || null;
    const priceText =
      $('[itemprop="price"]').first().attr('content') ||
      $('[itemprop="price"]').first().text().trim() ||
      $('[data-automation="buybox-price"]').first().text().trim() ||
      '';
    const price = priceText ? parseScrapePrice(priceText) : null;
    const imageUrl =
      $('[itemprop="image"]').first().attr('content') ||
      $('meta[property="og:image"]').attr('content') ||
      null;

    const fromJson = extractFromCapturedJson(capturedJson, mode);

    return {
      title: title || fromJson.title || null,
      price: price ?? fromJson.price ?? null,
      description: fromJson.description ?? null,
      imageUrl: imageUrl || fromJson.imageUrl || null,
      color: fromJson.color ?? null,
      size: fromJson.size ?? null,
    };
  },
};
