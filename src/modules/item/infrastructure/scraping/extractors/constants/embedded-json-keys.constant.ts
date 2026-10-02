export const PRICE_KEYS = [
  'price',
  'currentPrice',
  'salePrice',
  'listPrice',
  'regularPrice',
  'unitPrice',
] as const;

export const TITLE_KEYS = ['productName', 'title', 'name', 'displayName'] as const;

export const DESC_KEYS = ['description', 'shortDescription', 'longDescription'] as const;

export const IMAGE_KEYS = [
  'imageUrl',
  'primaryImage',
  'image',
  'thumbnail',
  'heroImage',
] as const;

/** Subtrees that contaminate product walks with recommendations/ads. */
export const EMBEDDED_JSON_SKIP_KEYS = [
  'recommendations',
  'similar',
  'related',
  'carousel',
  'sponsored',
  'upsell',
  'crossSell',
  'recentlyViewed',
  'ads',
] as const;

export const EMBEDDED_JSON_SKIP_KEY_SET = new Set<string>(
  EMBEDDED_JSON_SKIP_KEYS.map((k) => k.toLowerCase())
);
