/** Emoji and trademark symbols that never belong in a gift-list title. */
export const GIFT_TITLE_SYMBOL_PATTERN = /[\p{Extended_Pictographic}\uFE0F\u200D™®©]/gu;

/** Same check as above without the global flag, safe for repeated `.test()` calls. */
export const GIFT_TITLE_HAS_SYMBOL_PATTERN = /[\p{Extended_Pictographic}\uFE0F\u200D™®©]/u;

/** Store/site suffix separated from the product name by a pipe, e.g. "Razer Blade 14 | Razer United States". */
export const GIFT_TITLE_PIPE_SUFFIX_PATTERN = /\s+\|\s+/;

/** Marketing adjectives that may open a retailer title; stripped only when a product name remains. */
export const GIFT_TITLE_LEADING_FLUFF = [
  'Ultra-Thin',
  'Ultra Thin',
  'Ultra-Slim',
  'All-New',
  'Brand New',
] as const;

/** Generic product-type phrases that may close a retailer title; stripped only when 2+ words remain. */
export const GIFT_TITLE_TRAILING_PRODUCT_TYPES = [
  'Gaming Laptop',
  'Gaming Notebook',
  'Gaming Desktop',
  'Gaming PC',
] as const;
