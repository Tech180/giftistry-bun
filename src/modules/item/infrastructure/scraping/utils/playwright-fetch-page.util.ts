import { PLAYWRIGHT_PRICE_READY_SELECTOR } from '../constants/amazon-continue-shopping.constant';
import { PLAYWRIGHT_CONTENT_SELECTOR } from '../constants/playwright-content-selectors.constant';
import type { PlaywrightFetchResult } from '../interfaces/playwright-fetch-result.interface';
import { playwrightManager } from '../playwright-manager';
import { ScrapePlaywrightError } from '../errors/scrape-playwright-error';
import { scrapingConfig } from './scraping-config.util';
import { tryDismissAmazonContinueShopping } from './dismiss-amazon-continue-shopping.util';
import { NetworkJsonCapture } from './network-json-capture.util';

export async function playwrightFetchPage(
  url: string,
  timeoutMs = scrapingConfig.playwrightTimeoutMs
): Promise<PlaywrightFetchResult> {
  const context = await playwrightManager.acquire();

  try {
    const page = await context.newPage();
    const capture = new NetworkJsonCapture();
    capture.attach(page);

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    await tryDismissAmazonContinueShopping(page);
    await page.waitForSelector(PLAYWRIGHT_CONTENT_SELECTOR, { timeout: 3000 }).catch(() => {});

    const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
    if (scrollHeight > 0) {
      await page.evaluate((height) => window.scrollTo(0, height * 0.5), scrollHeight);
      await page.waitForTimeout(500);
      await page.evaluate((height) => window.scrollTo(0, height), scrollHeight);
      await page.waitForTimeout(500);
    }

    await page
      .waitForSelector(PLAYWRIGHT_PRICE_READY_SELECTOR, { timeout: 2000 })
      .catch(() => {});

    const html = await page.content();
    if (!html) {
      throw new ScrapePlaywrightError('Empty page content');
    }

    const finalUrl = page.url() || url;
    return { html, capturedJson: capture.getPayloads(), finalUrl };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Playwright scrape failed';
    throw new ScrapePlaywrightError(message);
  } finally {
    await playwrightManager.release(context);
  }
}

export async function playwrightFetchHtml(
  url: string,
  timeoutMs = scrapingConfig.playwrightTimeoutMs
): Promise<string> {
  const result = await playwrightFetchPage(url, timeoutMs);
  return result.html;
}
