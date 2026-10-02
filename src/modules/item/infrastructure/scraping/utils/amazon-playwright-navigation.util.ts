import {
  AMAZON_PRODUCT_READY_SELECTOR,
  AMAZON_PRODUCT_READY_TIMEOUT_MS,
} from '../constants/amazon-continue-shopping.constant';
import type { AmazonContinueShoppingPage } from '../interfaces/amazon-continue-shopping-page.interface';
import { tryDismissAmazonContinueShopping } from './dismiss-amazon-continue-shopping.util';
import {
  htmlLooksLikeContinueShoppingShell,
  isAmazonShortLinkHost,
} from './resolve-scrape-final-url.util';

export interface AmazonPlaywrightNavigationResult {
  dismissed: boolean;
  usedPostGate: boolean;
  usedReloadRetry: boolean;
}

async function stillOnAmazonGate(page: AmazonContinueShoppingPage): Promise<boolean> {
  let hostname = '';
  try {
    hostname = new URL(page.url()).hostname;
  } catch {
    return false;
  }
  const html = await page.content();
  return isAmazonShortLinkHost(hostname) || htmlLooksLikeContinueShoppingShell(html);
}

async function gotoAndDismiss(
  page: AmazonContinueShoppingPage,
  targetUrl: string,
  timeoutMs: number
): Promise<boolean> {
  if (!page.goto) {
    return false;
  }
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
  page: AmazonContinueShoppingPage,
  options: {
    postGateUrl?: string;
    /** Canonical product URL for a second reload when still gated (defaults to postGateUrl). */
    canonicalUrl?: string;
    timeoutMs: number;
  }
): Promise<AmazonPlaywrightNavigationResult> {
  const firstDismiss = await tryDismissAmazonContinueShopping(page);
  let dismissed = firstDismiss.dismissed;
  let usedPostGate = false;
  let usedReloadRetry = false;

  const postGateUrl = options.postGateUrl?.trim() || '';
  const canonicalUrl = options.canonicalUrl?.trim() || postGateUrl;

  if (postGateUrl && (await stillOnAmazonGate(page))) {
    dismissed = (await gotoAndDismiss(page, postGateUrl, options.timeoutMs)) || dismissed;
    usedPostGate = true;
  }

  const reloadTarget = canonicalUrl || postGateUrl;
  if (reloadTarget && (await stillOnAmazonGate(page))) {
    dismissed = (await gotoAndDismiss(page, reloadTarget, options.timeoutMs)) || dismissed;
    usedReloadRetry = true;
  }

  await page
    .waitForSelector(AMAZON_PRODUCT_READY_SELECTOR, { timeout: AMAZON_PRODUCT_READY_TIMEOUT_MS })
    .catch(() => {});

  return { dismissed, usedPostGate, usedReloadRetry };
}
