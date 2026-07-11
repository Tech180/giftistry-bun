import { playwrightManager } from './playwright-manager';
import { NetworkJsonCapture } from './network-json-capture';
import { scrapingConfig } from './scraping-config';

export class ScrapePlaywrightError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScrapePlaywrightError';
  }
}

export interface PlaywrightFetchResult {
  html: string;
  capturedJson: unknown[];
}

const CONTENT_SELECTORS = [
  'meta[property="og:title"]',
  'h1',
  '[itemprop="price"]',
  'script#__NEXT_DATA__',
  '[data-test="product-price"]',
  '#productTitle',
].join(', ');

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
    await page.waitForSelector(CONTENT_SELECTORS, { timeout: 3000 }).catch(() => {});

    const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
    if (scrollHeight > 0) {
      await page.evaluate((height) => window.scrollTo(0, height * 0.5), scrollHeight);
      await page.waitForTimeout(500);
      await page.evaluate((height) => window.scrollTo(0, height), scrollHeight);
      await page.waitForTimeout(500);
    }

    await page
      .waitForSelector('[itemprop="price"], [data-test="product-price"], .a-price .a-offscreen', {
        timeout: 2000,
      })
      .catch(() => {});

    const html = await page.content();
    if (!html) {
      throw new ScrapePlaywrightError('Empty page content');
    }

    return { html, capturedJson: capture.getPayloads() };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Playwright scrape failed';
    throw new ScrapePlaywrightError(message);
  } finally {
    await playwrightManager.release(context);
  }
}

// Backward-compatible helper
export async function playwrightFetchHtml(
  url: string,
  timeoutMs = scrapingConfig.playwrightTimeoutMs
): Promise<string> {
  const result = await playwrightFetchPage(url, timeoutMs);
  return result.html;
}
