import type { PageType } from '../types/page-type.type';
import type { ClassifyPageTypeOptions } from '../interfaces/classify-page-type-options.interface';
import {
  CART_PAGE_MARKERS,
  ERROR_PAGE_MARKERS,
  HOME_PAGE_MARKERS,
  LISTING_PAGE_MARKERS,
} from '../constants/page-type-markers.constant';

function stripTags(html: string): string {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ');
}

function extractTitle(html: string): string {
  return html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? '';
}

function countProductLd(html: string): number {
  const blocks = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi);
  if (!blocks) {
    return 0;
  }
  let count = 0;
  for (const block of blocks) {
    const jsonText = block.replace(/^[\s\S]*?>/, '').replace(/<\/script>$/i, '');
    try {
      const data = JSON.parse(jsonText) as unknown;
      const nodes = Array.isArray(data) ? data : [data];
      for (const node of nodes) {
        if (!node || typeof node !== 'object') continue;
        const type = (node as { '@type'?: unknown })['@type'];
        const types = Array.isArray(type) ? type : [type];
        if (types.some((t) => typeof t === 'string' && t.toLowerCase() === 'product')) {
          count += 1;
        }
      }
    } catch {
      // ignore
    }
  }
  return count;
}

function haystack(html: string): string {
  const title = extractTitle(html);
  const visible = stripTags(html).replace(/\s+/g, ' ').trim().toLowerCase();
  return `${title.toLowerCase()} ${visible}`;
}

function includesAny(text: string, markers: readonly string[]): boolean {
  return markers.some((m) => text.includes(m));
}

/**
 * Heuristic page classification from HTML (and optional HTTP status).
 */
export function classifyPageType(html: string, options: ClassifyPageTypeOptions = {}): PageType {
  const status = options.httpStatus;
  if (status != null && (status === 404 || status === 410)) {
    return 'error';
  }
  if (!html) {
    return 'error';
  }

  const text = haystack(html);
  if (includesAny(text, CART_PAGE_MARKERS)) {
    return 'cart';
  }

  if (includesAny(text, ERROR_PAGE_MARKERS) && countProductLd(html) === 0) {
    return 'error';
  }

  const productSignals =
    countProductLd(html) > 0 ||
    /property=["']og:type["'][^>]*content=["']product["']/i.test(html) ||
    /itemtype=["'][^"']*schema\.org\/product["']/i.test(html);

  if (includesAny(text, LISTING_PAGE_MARKERS) && !productSignals) {
    return 'listing';
  }

  if (productSignals || /add to cart|buy now|add to bag/i.test(text)) {
    return 'product';
  }

  if (includesAny(text, HOME_PAGE_MARKERS) && !productSignals) {
    return 'home';
  }

  return productSignals ? 'product' : 'listing';
}
