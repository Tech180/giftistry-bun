import {
  AMAZON_CONTINUE_SHOPPING_CTA_SELECTORS,
  AMAZON_PRODUCT_READY_SELECTOR,
} from '../constants/amazon-continue-shopping.constant';
import type { AmazonContinueShoppingPage } from '../interfaces/amazon-continue-shopping-page.interface';
import {
  htmlLooksLikeContinueShoppingShell,
  isAmazonShortLinkHost,
} from './resolve-scrape-final-url.util';

export async function tryDismissAmazonContinueShopping(
  page: AmazonContinueShoppingPage
): Promise<void> {
  let hostname = '';
  try {
    hostname = new URL(page.url()).hostname;
  } catch {
    return;
  }

  const html = await page.content();
  const looksLikeGate =
    isAmazonShortLinkHost(hostname) || htmlLooksLikeContinueShoppingShell(html);
  if (!looksLikeGate) return;

  for (const selector of AMAZON_CONTINUE_SHOPPING_CTA_SELECTORS) {
    try {
      const target = page.locator(selector).first();
      if (!(await target.isVisible({ timeout: 500 }))) continue;
      await target.click({ timeout: 2000 });
      await page
        .waitForSelector(AMAZON_PRODUCT_READY_SELECTOR, { timeout: 5000 })
        .catch(() => {});
      await page.waitForTimeout(300);
      return;
    } catch {
      /* try next CTA */
    }
  }
}
