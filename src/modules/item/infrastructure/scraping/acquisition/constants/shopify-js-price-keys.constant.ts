/** Product-level price fields in Shopify `/products/{handle}.js`, expressed in minor units (cents). */
export const SHOPIFY_JS_PRODUCT_PRICE_KEYS = [
  'price',
  'price_min',
  'price_max',
  'compare_at_price',
  'compare_at_price_min',
  'compare_at_price_max',
] as const;

/** Variant-level price fields in Shopify `/products/{handle}.js`, expressed in minor units (cents). */
export const SHOPIFY_JS_VARIANT_PRICE_KEYS = ['price', 'compare_at_price', 'unit_price'] as const;
