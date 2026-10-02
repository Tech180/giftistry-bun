import { PLAYWRIGHT_PRICE_READY_SELECTOR } from '../constants/amazon-continue-shopping.constant';
import { PLAYWRIGHT_CONTENT_SELECTOR } from '../constants/playwright-content-selectors.constant';
import type { PlaywrightFetchResult } from '../interfaces/playwright-fetch-result.interface';
import { closePlaywrightPage, playwrightManager } from '../playwright-manager';
import { ScrapePlaywrightError } from '../errors/scrape-playwright-error';
import { scrapingConfig } from './scraping-config.util';
import { runAmazonPlaywrightNavigation } from './amazon-playwright-navigation.util';
import { isAmazonScrapeUrl } from '../../../domain/utils/amazon-url.util';
import { tryDismissAmazonContinueShopping } from './dismiss-amazon-continue-shopping.util';
import { dismissConsentBanners } from './dismiss-consent-banners.util';
import { SCRAPE_MIN_TIER_BUDGET_MS } from '../constants/scrape-budget.constant';
import { boundTimeoutMs, isBudgetExhausted, remainingBudgetMs } from './scrape-deadline.util';
import { NetworkJsonCapture } from './network-json-capture.util';
import type { Page } from 'playwright';
import type { PlaywrightFetchPageOptions } from '../interfaces/playwright-fetch-page-options.interface';

export async function playwrightFetchPage(
  url: string,
  timeoutMs = scrapingConfig.playwrightTimeoutMs,
  options: PlaywrightFetchPageOptions = {}
): Promise<PlaywrightFetchResult> {
  const lease = await playwrightManager.acquire();
  let page: Page | null = null;

  const abortSignal = options.signal;
  const deadlineAt = options.deadlineAt;
  let abortListener: (() => void) | undefined;
  let deadlineTimer: ReturnType<typeof setTimeout> | undefined;

  try {
    page = await lease.context.newPage();
    const capture = new NetworkJsonCapture();
    capture.attach(page);

    if (abortSignal) {
      if (abortSignal.aborted) {
        throw new ScrapePlaywrightError('Playwright scrape aborted');
      }
      abortListener = () => {
        void closePlaywrightPage(page);
      };
      abortSignal.addEventListener('abort', abortListener, { once: true });
    }

    if (deadlineAt != null) {
      // Hard cap: closing the page makes any in-flight Playwright call reject.
      deadlineTimer = setTimeout(
        () => void closePlaywrightPage(page),
        remainingBudgetMs(deadlineAt) ?? 0
      );
    }

    const response = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: boundTimeoutMs(timeoutMs, deadlineAt),
    });
    const status = response?.status();

    const amazonNav =
      isAmazonScrapeUrl(url) || (options.postGateUrl && isAmazonScrapeUrl(options.postGateUrl));
    if (amazonNav) {
      const canonicalUrl = options.postGateUrl?.trim() || url;
      await runAmazonPlaywrightNavigation(page, {
        postGateUrl: options.postGateUrl,
        canonicalUrl,
        timeoutMs,
        deadlineAt,
      });
    } else {
      await tryDismissAmazonContinueShopping(page);
      await dismissConsentBanners(page);
    }

    await page
      .waitForSelector(PLAYWRIGHT_CONTENT_SELECTOR, { timeout: boundTimeoutMs(3000, deadlineAt) })
      .catch(() => {});

    if (!isBudgetExhausted(deadlineAt, SCRAPE_MIN_TIER_BUDGET_MS)) {
      const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
      if (scrollHeight > 0) {
        await page.evaluate((height) => window.scrollTo(0, height * 0.5), scrollHeight);
        await page.waitForTimeout(boundTimeoutMs(500, deadlineAt));
        await page.evaluate((height) => window.scrollTo(0, height), scrollHeight);
        await page.waitForTimeout(boundTimeoutMs(500, deadlineAt));
      }

      await page
        .waitForSelector(PLAYWRIGHT_PRICE_READY_SELECTOR, {
          timeout: boundTimeoutMs(2000, deadlineAt),
        })
        .catch(() => {});
    }

    const html = await page.content();
    if (!html) {
      throw new ScrapePlaywrightError('Empty page content');
    }

    const finalUrl = page.url() || url;
    return { html, capturedJson: capture.getPayloads(), finalUrl, status };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Playwright scrape failed';
    throw new ScrapePlaywrightError(message);
  } finally {
    if (deadlineTimer) clearTimeout(deadlineTimer);
    if (abortSignal && abortListener) {
      abortSignal.removeEventListener('abort', abortListener);
    }
    await closePlaywrightPage(page);
    await lease.release();
  }
}

export async function playwrightFetchHtml(
  url: string,
  timeoutMs = scrapingConfig.playwrightTimeoutMs
): Promise<string> {
  const result = await playwrightFetchPage(url, timeoutMs);
  return result.html;
}
