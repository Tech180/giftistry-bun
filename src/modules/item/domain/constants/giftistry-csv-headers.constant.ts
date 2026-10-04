export const GIFTISTRY_TABULAR_COLUMN_KEYS = [
  'category',
  'priority',
  'item',
  'star',
  'price',
  'website',
  'description',
  'suggestion',
  'linkedItems',
  'relatedItems',
] as const;

/** Canonical tabular export header. CSV and XLSX use this exact order. */
export const GIFTISTRY_TABULAR_HEADERS = [
  'Category',
  'Priority',
  'Item',
  'Star',
  'Price',
  'Website Link',
  'Description',
  'Suggestion',
  'Linked Items',
  'Related Items',
] as const;

/** Import-only columns removed from new exports (legacy files may still include them). */
export const GIFTISTRY_LEGACY_IMPORT_TABULAR_LABEL_TO_KEY = {
  Audience: 'audience',
} as const;

/** Older exports ended at Suggestion and omitted linked/related columns. */
export const GIFTISTRY_LEGACY_TABULAR_COLUMN_COUNT = 9;

export const GIFTISTRY_LEGACY_TABULAR_HEADERS = [
  'Category',
  'Priority',
  'Item',
  'Star',
  'Price',
  'Website Link',
  'Description',
  'Audience',
  'Suggestion',
] as const;

/** @deprecated Use GIFTISTRY_LEGACY_TABULAR_HEADERS or GIFTISTRY_TABULAR_HEADERS. */
export const GIFTISTRY_CSV_HEADERS = GIFTISTRY_LEGACY_TABULAR_HEADERS;

/** Accept these as the website column when detecting Giftistry tabular exports. */
export const WEBSITE_HEADER_ALIASES = new Set(['Website Link', 'Website']);

export const GIFTISTRY_TXT_LABELS = {
  description: 'Description',
  audience: 'Audience',
  suggestion: 'Suggestion',
  linkedItems: 'Linked Items',
  relatedItems: 'Related Items',
} as const;

export const GIFTISTRY_MD_META_KEYS = {
  category: 'Category',
  priority: 'Priority',
  favorite: 'Favorite',
  price: 'Price',
  link: 'Link',
  retailer: 'Retailer',
  audience: 'Audience',
  suggestion: 'Suggestion',
  linkedItems: 'Linked Items',
  relatedItems: 'Related Items',
} as const;
