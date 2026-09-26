export const GIFTISTRY_CSV_HEADERS = [
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

/** Accept these as the Website Link column when detecting Giftistry tabular exports. */
export const WEBSITE_HEADER_ALIASES = new Set(['Website Link', 'Website']);
