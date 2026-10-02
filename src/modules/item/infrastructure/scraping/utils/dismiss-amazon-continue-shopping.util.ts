import {
  AMAZON_CONTINUE_SHOPPING_CTA_SELECTORS,
  AMAZON_CTA_VISIBLE_TIMEOUT_MS,
  AMAZON_PRODUCT_READY_SELECTOR,
  AMAZON_PRODUCT_READY_TIMEOUT_MS,
} from '../constants/amazon-continue-shopping.constant';
import type { AmazonContinueShoppingPage } from '../interfaces/amazon-continue-shopping-page.interface';
import {
  htmlLooksLikeContinueShoppingShell,
  isAmazonShortLinkHost,
} from './resolve-scrape-final-url.util';

export interface DismissAmazonContinueShoppingResult {
  dismissed: boolean;
}

async function clickVisibleTarget(
  target: {
    isVisible: (opts?: { timeout?: number }) => Promise<boolean>;
    click: (opts?: { timeout?: number }) => Promise<void>;
  },
  page: AmazonContinueShoppingPage
): Promise<boolean> {
  if (!(await target.isVisible({ timeout: AMAZON_CTA_VISIBLE_TIMEOUT_MS }))) {
    return false;
  }
  await target.click({ timeout: 2000 });
  await page
    .waitForSelector(AMAZON_PRODUCT_READY_SELECTOR, { timeout: AMAZON_PRODUCT_READY_TIMEOUT_MS })
    .catch(() => {});
  await page.waitForTimeout(300);
  return true;
}

export async function tryDismissAmazonContinueShopping(
  page: AmazonContinueShoppingPage
): Promise<DismissAmazonContinueShoppingResult> {
  let hostname = '';
  try {
    hostname = new URL(page.url()).hostname;
  } catch {
    return { dismissed: false };
  }

  const html = await page.content();
  const looksLikeGate =
    isAmazonShortLinkHost(hostname) || htmlLooksLikeContinueShoppingShell(html);
  if (!looksLikeGate) {
    return { dismissed: false };
  }

  for (const selector of AMAZON_CONTINUE_SHOPPING_CTA_SELECTORS) {
    try {
      const target = page.locator(selector).first();
      if (await clickVisibleTarget(target, page)) {
        return { dismissed: true };
      }
    } catch {
      /* try next CTA */
    }
  }

  if (page.getByRole) {
    try {
      const roleTarget = page.getByRole('button', { name: /continue shopping/i }).first();
      if (await clickVisibleTarget(roleTarget, page)) {
        return { dismissed: true };
      }
    } catch {
      /* ignore */
    }
  }

  return { dismissed: false };
}
