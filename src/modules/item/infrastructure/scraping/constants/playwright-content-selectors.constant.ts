export const PLAYWRIGHT_CONTENT_SELECTORS = [
  'meta[property="og:title"]',
  'h1',
  '[itemprop="price"]',
  'script#__NEXT_DATA__',
  '[data-test="product-price"]',
  '#productTitle',
] as const;

export const PLAYWRIGHT_CONTENT_SELECTOR = PLAYWRIGHT_CONTENT_SELECTORS.join(', ');
