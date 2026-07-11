import * as cheerio from 'cheerio';
import type { MetadataExtractor } from './types';
import { extractJsonLdProductDetails, parseJsonLdBlocks } from './json-ld-product.util';

function parsePrice(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^0-9.]/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function extractFromObject(obj: unknown, acc: {
  title: string | null;
  price: number | null;
  description: string | null;
  imageUrl: string | null;
  color: string | null;
  size: string | null;
}): void {
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
      else if (Array.isArray(record.image) && typeof record.image[0] === 'string') acc.imageUrl = record.image[0];
      else if (record.image && typeof record.image === 'object' && 'url' in (record.image as object)) {
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
    const price = parsePrice(record.price ?? record.lowPrice ?? record.highPrice);
    if (price !== null && acc.price === null) acc.price = price;
  }

  if (record.offers) {
    if (Array.isArray(record.offers)) record.offers.forEach((o) => extractFromObject(o, acc));
    else extractFromObject(record.offers, acc);
  }

  if (Array.isArray(record['@graph'])) {
    record['@graph'].forEach((item) => extractFromObject(item, acc));
  }
}

export const jsonLdExtractor: MetadataExtractor = {
  name: 'json-ld',
  priority: 50,
  extract({ html, url, mode }) {
    const productGroup = extractJsonLdProductDetails(html, url);
    const acc = {
      title: productGroup?.title ?? null,
      price: productGroup?.price ?? null,
      description: productGroup?.description ?? null,
      imageUrl: productGroup?.imageUrl ?? null,
      color: productGroup?.color ?? null,
      size: productGroup?.size ?? null,
    };

    const userDefinedFields: Record<string, string> = {};
    if (productGroup?.brand) {
      userDefinedFields.Brand = productGroup.brand;
    }

    for (const block of parseJsonLdBlocks(html)) {
      if (Array.isArray(block)) block.forEach((item) => extractFromObject(item, acc));
      else extractFromObject(block, acc);
    }

    if (mode === 'minimal') {
      return { title: acc.title, price: acc.price, description: acc.description, imageUrl: acc.imageUrl };
    }

    return {
      ...acc,
      ...(Object.keys(userDefinedFields).length > 0 ? { userDefinedFields } : {}),
    };
  },
};
