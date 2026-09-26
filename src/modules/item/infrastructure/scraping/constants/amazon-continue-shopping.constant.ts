/** Locators tried when dismissing Amazon “Continue shopping” interstitial. */
export const AMAZON_CONTINUE_SHOPPING_CTA_SELECTORS = [
  'text=Continue shopping',
  'input[type="submit"]',
  'button:has-text("Continue")',
  'a:has-text("Continue shopping")',
] as const;

export const AMAZON_PRODUCT_READY_SELECTOR =
  '#productTitle, meta[property="og:title"]';

export const PLAYWRIGHT_PRICE_READY_SELECTOR =
  '[itemprop="price"], [data-test="product-price"], .a-price .a-offscreen';
