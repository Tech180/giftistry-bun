import {
  SHOPIFY_JS_PRODUCT_PRICE_KEYS,
  SHOPIFY_JS_VARIANT_PRICE_KEYS,
} from '../constants/shopify-js-price-keys.constant';

function centsToUnits(value: unknown): unknown {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.round(value) / 100;
  }
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    return Number.parseInt(value.trim(), 10) / 100;
  }
  return value;
}

function convertKeys(record: Record<string, unknown>, keys: readonly string[]): void {
  for (const key of keys) {
    if (key in record) {
      record[key] = centsToUnits(record[key]);
    }
  }
}

/**
 * Shopify's `/products/{handle}.js` endpoint reports every price in cents (e.g. `33900` for $339.00).
 * Returns a copy with product and variant prices converted to currency units so downstream
 * extractors never mistake cents for dollars. Non-object payloads are returned unchanged.
 */
export function normalizeShopifyProductJsPrices(payload: unknown): unknown {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return payload;
  }

  const product: Record<string, unknown> = { ...(payload as Record<string, unknown>) };
  convertKeys(product, SHOPIFY_JS_PRODUCT_PRICE_KEYS);

  if (Array.isArray(product.variants)) {
    product.variants = product.variants.map((variant) => {
      if (!variant || typeof variant !== 'object' || Array.isArray(variant)) {
        return variant;
      }
      const next: Record<string, unknown> = { ...(variant as Record<string, unknown>) };
      convertKeys(next, SHOPIFY_JS_VARIANT_PRICE_KEYS);
      return next;
    });
  }

  return product;
}
