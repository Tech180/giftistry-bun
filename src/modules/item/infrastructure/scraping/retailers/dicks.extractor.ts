import { extractFromCapturedJson } from '../extractors/embedded-json.extractor';
import type { RetailerExtractor } from './retailer-registry';

function extractFromDsgJson(capturedJson: unknown[]): ReturnType<RetailerExtractor['extract']> {
  for (const json of capturedJson) {
    if (!json || typeof json !== 'object') continue;
    const record = json as Record<string, unknown>;

    const product = (record.product ?? record.Product ?? record.pdp ?? record.data) as
      | Record<string, unknown>
      | undefined;
    if (!product || typeof product !== 'object') continue;

    const title =
      (typeof product.name === 'string' && product.name) ||
      (typeof product.productName === 'string' && product.productName) ||
      (typeof product.displayName === 'string' && product.displayName) ||
      null;

    const priceRaw =
      product.price ??
      product.listPrice ??
      product.salePrice ??
      (product.pricing as Record<string, unknown> | undefined)?.price;
    const price =
      typeof priceRaw === 'number'
        ? priceRaw
        : typeof priceRaw === 'string'
          ? Number(priceRaw.replace(/[^0-9.]/g, ''))
          : null;

    const imageUrl =
      (typeof product.imageUrl === 'string' && product.imageUrl) ||
      (typeof product.primaryImage === 'string' && product.primaryImage) ||
      (Array.isArray(product.images) && typeof product.images[0] === 'string'
        ? product.images[0]
        : null);

    const color = typeof product.color === 'string' ? product.color : null;

    if (title || price !== null || imageUrl) {
      return {
        title,
        price: Number.isFinite(price) ? price : null,
        imageUrl,
        color,
        description: typeof product.description === 'string' ? product.description : null,
      };
    }
  }

  return extractFromCapturedJson(capturedJson, 'full');
}

export const dicksExtractor: RetailerExtractor = {
  hostnames: ['dickssportinggoods.com'],
  priority: 60,
  extract({ html, mode, capturedJson = [] }) {
    const fromJson = extractFromDsgJson(capturedJson);

    const titleMatch = html.match(/<h1[^>]*>([^<]+)</i);
    const priceMatch = html.match(/"price"\s*:\s*([0-9.]+)/);

    const result = {
      title: fromJson.title || (titleMatch?.[1]?.trim() ?? null),
      price: fromJson.price ?? (priceMatch ? Number(priceMatch[1]) : null),
      description: fromJson.description ?? null,
      imageUrl: fromJson.imageUrl ?? null,
      color: fromJson.color ?? null,
      size: fromJson.size ?? null,
    };

    if (mode === 'minimal') {
      return { title: result.title, price: result.price, imageUrl: result.imageUrl };
    }
    return result;
  },
};
