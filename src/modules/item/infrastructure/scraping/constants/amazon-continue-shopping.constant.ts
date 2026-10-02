/** Locators tried when dismissing Amazon “Continue shopping” interstitial. */
export const AMAZON_CONTINUE_SHOPPING_CTA_SELECTORS = [
  'text=Continue shopping',
  'input[type="submit"]',
  'button:has-text("Continue")',
  'a:has-text("Continue shopping")',
] as const;

export const AMAZON_PRODUCT_READY_SELECTOR =
  '#productTitle, meta[property="og:title"]';

/** Longer wait for Amazon product DOM after gate dismiss / post-gate navigation. */
export const AMAZON_PRODUCT_READY_TIMEOUT_MS = 12_000;

/** CTA visibility timeout when probing continue-shopping buttons. */
export const AMAZON_CTA_VISIBLE_TIMEOUT_MS = 1500;

export const PLAYWRIGHT_PRICE_READY_SELECTOR =
  '[itemprop="price"], [data-test="product-price"], .a-price .a-offscreen';
