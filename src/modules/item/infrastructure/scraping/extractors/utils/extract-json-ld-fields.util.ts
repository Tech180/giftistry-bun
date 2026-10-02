import type { ExtractionAccumulator } from '../interfaces/extraction-accumulator.interface';
import { parseScrapePrice } from './parse-scrape-price.util';
import { JSON_LD_PRODUCT_TYPES } from '../../constants/json-ld-product-types.constant';

function typeTokens(raw: unknown): string[] {
  if (typeof raw === 'string') {
    return [raw.toLowerCase()];
  }
  if (Array.isArray(raw)) {
    return raw.filter((t): t is string => typeof t === 'string').map((t) => t.toLowerCase());
  }
  return [];
}

function isProductType(raw: unknown): boolean {
  return typeTokens(raw).some((t) => JSON_LD_PRODUCT_TYPES.has(t));
}

function isOfferType(raw: unknown): boolean {
  return typeTokens(raw).some(
    (t) => t === 'offer' || t === 'aggregateoffer' || t === 'unitpricespecification' || t === 'pricespecification'
  );
}

function availabilityRank(value: unknown): number {
  const text = String(value ?? '').toLowerCase();
  if (text.includes('instock') || text.includes('in stock')) {
    return 0;
  }
  if (text.includes('limited') || text.includes('preorder')) {
    return 1;
  }
  return 2;
}

function extractOfferPrice(offer: Record<string, unknown>): number | null {
  const direct = parseScrapePrice(offer.price ?? offer.lowPrice ?? offer.highPrice);
  if (direct != null) {
    return direct;
  }

  const spec = offer.priceSpecification;
  const specs = Array.isArray(spec) ? spec : spec ? [spec] : [];
  for (const entry of specs) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }
    const amount = parseScrapePrice((entry as Record<string, unknown>).price);
    if (amount != null) {
      return amount;
    }
  }
  return null;
}

function pickBestOfferPrice(offers: unknown): number | null {
  const list = Array.isArray(offers) ? offers : offers ? [offers] : [];
  const candidates: Array<{ price: number; rank: number }> = [];

  for (const offer of list) {
    if (!offer || typeof offer !== 'object') {
      continue;
    }
    const record = offer as Record<string, unknown>;
    if (record['@type'] && !isOfferType(record['@type']) && record.price == null && record.lowPrice == null) {
      continue;
    }
    const price = extractOfferPrice(record);
    if (price == null) {
      continue;
    }
    candidates.push({ price, rank: availabilityRank(record.availability) });
  }

  if (!candidates.length) {
    return null;
  }
  candidates.sort((a, b) => a.rank - b.rank || a.price - b.price);
  return candidates[0]!.price;
}

export function extractJsonLdFieldsFromObject(obj: unknown, acc: ExtractionAccumulator): void {
  if (!obj || typeof obj !== 'object') {
    return;
  }
  const record = obj as Record<string, unknown>;
  const isProduct = isProductType(record['@type']);
  const isOffer = isOfferType(record['@type']);

  if (isProduct) {
    if (!acc.title && typeof record.name === 'string') {
      acc.title = record.name;
    }
    if (!acc.title && typeof record.productName === 'string') {
      acc.title = record.productName;
    }
    if (!acc.description && typeof record.description === 'string') {
      acc.description = record.description;
    }
    if (!acc.imageUrl) {
      if (typeof record.image === 'string') {
        acc.imageUrl = record.image;
      } else if (Array.isArray(record.image) && typeof record.image[0] === 'string') {
        acc.imageUrl = record.image[0];
      } else if (record.image && typeof record.image === 'object' && 'url' in (record.image as object)) {
        acc.imageUrl = String((record.image as { url: unknown }).url);
      }
    }
    if (!acc.color) {
      if (typeof record.color === 'string') {
        acc.color = record.color;
      } else if (record.color && typeof record.color === 'object' && 'name' in record.color) {
        acc.color = String((record.color as { name: unknown }).name);
      }
    }
    if (!acc.size) {
      if (typeof record.size === 'string') {
        acc.size = record.size;
      } else if (record.size && typeof record.size === 'object' && 'name' in record.size) {
        acc.size = String((record.size as { name: unknown }).name);
      }
    }
  }

  if (isOffer || record.price !== undefined || record.lowPrice !== undefined) {
    const price = extractOfferPrice(record);
    if (price !== null && acc.price === null) {
      acc.price = price;
    }
  }

  if (record.offers) {
    const best = pickBestOfferPrice(record.offers);
    if (best !== null && acc.price === null) {
      acc.price = best;
    }
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
