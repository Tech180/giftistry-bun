import type { ExtractionAccumulator } from '../interfaces/extraction-accumulator.interface';
import { parseScrapePrice } from './parse-scrape-price.util';

export function extractJsonLdFieldsFromObject(obj: unknown, acc: ExtractionAccumulator): void {
  if (!obj || typeof obj !== 'object') return;
  const record = obj as Record<string, unknown>;
  const type = String(record['@type'] ?? '').toLowerCase();

  const isProduct = type.includes('product');
  const isOffer = type.includes('offer');

  if (isProduct || record.name || record.productName) {
    if (!acc.title && typeof record.name === 'string') acc.title = record.name;
    if (!acc.title && typeof record.productName === 'string') acc.title = record.productName;
    if (!acc.description && typeof record.description === 'string') acc.description = record.description;
    if (!acc.imageUrl) {
      if (typeof record.image === 'string') acc.imageUrl = record.image;
      else if (Array.isArray(record.image) && typeof record.image[0] === 'string') {
        acc.imageUrl = record.image[0];
      } else if (record.image && typeof record.image === 'object' && 'url' in (record.image as object)) {
        acc.imageUrl = String((record.image as { url: unknown }).url);
      }
    }
    if (!acc.color) {
      if (typeof record.color === 'string') acc.color = record.color;
      else if (record.color && typeof record.color === 'object' && 'name' in record.color) {
        acc.color = String((record.color as { name: unknown }).name);
      }
    }
    if (!acc.size) {
      if (typeof record.size === 'string') acc.size = record.size;
      else if (record.size && typeof record.size === 'object' && 'name' in record.size) {
        acc.size = String((record.size as { name: unknown }).name);
      }
    }
  }

  if (isOffer || record.price !== undefined || record.lowPrice !== undefined) {
    const price = parseScrapePrice(record.price ?? record.lowPrice ?? record.highPrice);
    if (price !== null && acc.price === null) acc.price = price;
  }

  if (record.offers) {
    if (Array.isArray(record.offers)) {
      record.offers.forEach((o) => extractJsonLdFieldsFromObject(o, acc));
    } else {
      extractJsonLdFieldsFromObject(record.offers, acc);
    }
  }

  if (Array.isArray(record['@graph'])) {
    record['@graph'].forEach((item) => extractJsonLdFieldsFromObject(item, acc));
  }
}
