import type { Page } from 'playwright';
import {
  buildAmazonProductUrl,
  parseAmazonAsinFromHtml,
} from '../../../domain/utils/amazon-url.util';
import {
  AMAZON_PRODUCT_READY_SELECTOR,
  AMAZON_PRODUCT_READY_TIMEOUT_MS,
} from '../constants/amazon-continue-shopping.constant';
import { runAmazonPlaywrightNavigation } from './amazon-playwright-navigation.util';
import { boundTimeoutMs, isBudgetExhausted } from './scrape-deadline.util';
import { AMAZON_NAV_RETRY_MIN_BUDGET_MS } from '../constants/scrape-budget.constant';

function htmlLacksProductTitle(html: string): boolean {
  return !/id=["']productTitle["']/i.test(html);
}

export async function recoverAmazonProductPageInSession(
  page: Page,
  options: { timeoutMs: number; deadlineAt?: number }
): Promise<boolean> {
  if (isBudgetExhausted(options.deadlineAt, AMAZON_NAV_RETRY_MIN_BUDGET_MS)) {
    return false;
  }

  const html = await page.content();
  if (!htmlLacksProductTitle(html)) {
    return false;
  }

  const asin = parseAmazonAsinFromHtml(html);
  if (!asin) {
    return false;
  }

  let localeHost = 'www.amazon.com';
  try {
    localeHost = new URL(page.url()).hostname || localeHost;
  } catch {
    /* default host */
  }

  const productUrl = buildAmazonProductUrl(asin, localeHost);
  await runAmazonPlaywrightNavigation(page, {
    postGateUrl: productUrl,
    canonicalUrl: productUrl,
    timeoutMs: options.timeoutMs,
    deadlineAt: options.deadlineAt,
  });

  await page
    .waitForSelector(AMAZON_PRODUCT_READY_SELECTOR, {
      timeout: boundTimeoutMs(AMAZON_PRODUCT_READY_TIMEOUT_MS, options.deadlineAt),
    })
    .catch(() => {});

  return true;
}
