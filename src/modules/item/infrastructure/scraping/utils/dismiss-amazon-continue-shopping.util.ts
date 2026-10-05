import type { Page } from 'playwright';
import {
  AMAZON_CONTINUE_SHOPPING_CTA_SELECTORS,
  AMAZON_CTA_VISIBLE_TIMEOUT_MS,
  AMAZON_PRODUCT_READY_SELECTOR,
  AMAZON_PRODUCT_READY_TIMEOUT_MS,
} from '../constants/amazon-continue-shopping.constant';
import { htmlLooksLikeContinueShoppingShell } from './html-looks-like-continue-shopping-shell.util';
import { isAmazonProductHost, isAmazonShortLinkHost } from '../../../domain/utils/amazon-url.util';
import type { DismissAmazonContinueShoppingResult } from '../interfaces/dismiss-amazon-continue-shopping-result.interface';

async function clickVisibleTarget(
  target: {
    isVisible: (opts?: { timeout?: number }) => Promise<boolean>;
    click: (opts?: { timeout?: number }) => Promise<void>;
  },
  page: Page
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
  page: Page
): Promise<DismissAmazonContinueShoppingResult> {
  let hostname = '';
  try {
    hostname = new URL(page.url()).hostname;
  } catch {
    return { dismissed: false };
  }

  const html = await page.content();
  const lacksProductTitle = !/id=["']productTitle["']/i.test(html);
  const looksLikeGate =
    isAmazonShortLinkHost(hostname) ||
    htmlLooksLikeContinueShoppingShell(html) ||
    (isAmazonProductHost(hostname) && lacksProductTitle);
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
