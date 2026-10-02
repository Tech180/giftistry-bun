import type { Page } from 'playwright';
import {
  AMAZON_PRODUCT_READY_SELECTOR,
  AMAZON_PRODUCT_READY_TIMEOUT_MS,
} from '../constants/amazon-continue-shopping.constant';
import { tryDismissAmazonContinueShopping } from './dismiss-amazon-continue-shopping.util';
import { htmlLooksLikeContinueShoppingShell } from './html-looks-like-continue-shopping-shell.util';
import { AMAZON_NAV_RETRY_MIN_BUDGET_MS } from '../constants/scrape-budget.constant';
import { boundTimeoutMs, isBudgetExhausted } from './scrape-deadline.util';
import { isAmazonShortLinkHost } from '../../../domain/utils/amazon-url.util';
import type { AmazonPlaywrightNavigationResult } from '../interfaces/amazon-playwright-navigation-result.interface';

async function stillOnAmazonGate(page: Page): Promise<boolean> {
  let hostname = '';
  try {
    hostname = new URL(page.url()).hostname;
  } catch {
    return false;
  }
  const html = await page.content();
  return isAmazonShortLinkHost(hostname) || htmlLooksLikeContinueShoppingShell(html);
}

async function gotoAndDismiss(page: Page, targetUrl: string, timeoutMs: number): Promise<boolean> {
  await page.goto(targetUrl, {
    waitUntil: 'domcontentloaded',
    timeout: timeoutMs,
  });
  const dismiss = await tryDismissAmazonContinueShopping(page);
  return dismiss.dismissed;
}

/**
 * Dismiss Amazon continue-shopping interstitial, optionally navigate to a
 * canonical product URL when still gated, then one reload retry if needed.
 */
export async function runAmazonPlaywrightNavigation(
  page: Page,
  options: {
    postGateUrl?: string;
    /** Canonical product URL for a second reload when still gated (defaults to postGateUrl). */
    canonicalUrl?: string;
    timeoutMs: number;
    /** Absolute epoch-ms deadline; retries are skipped and waits capped when little remains. */
    deadlineAt?: number;
  }
): Promise<AmazonPlaywrightNavigationResult> {
  const firstDismiss = await tryDismissAmazonContinueShopping(page);
  let dismissed = firstDismiss.dismissed;
  let usedPostGate = false;
  let usedReloadRetry = false;

  const postGateUrl = options.postGateUrl?.trim() || '';
  const canonicalUrl = options.canonicalUrl?.trim() || postGateUrl;

  const canRetry = () => !isBudgetExhausted(options.deadlineAt, AMAZON_NAV_RETRY_MIN_BUDGET_MS);
  const navTimeoutMs = () => boundTimeoutMs(options.timeoutMs, options.deadlineAt);

  if (postGateUrl && canRetry() && (await stillOnAmazonGate(page))) {
    dismissed = (await gotoAndDismiss(page, postGateUrl, navTimeoutMs())) || dismissed;
    usedPostGate = true;
  }

  const reloadTarget = canonicalUrl || postGateUrl;
  if (reloadTarget && canRetry() && (await stillOnAmazonGate(page))) {
    dismissed = (await gotoAndDismiss(page, reloadTarget, navTimeoutMs())) || dismissed;
    usedReloadRetry = true;
  }

  await page
    .waitForSelector(AMAZON_PRODUCT_READY_SELECTOR, {
      timeout: boundTimeoutMs(AMAZON_PRODUCT_READY_TIMEOUT_MS, options.deadlineAt),
    })
    .catch(() => {});

  return { dismissed, usedPostGate, usedReloadRetry };
}
