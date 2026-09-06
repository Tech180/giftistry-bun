import { playwrightManager } from './playwright-manager';
import { NetworkJsonCapture } from './network-json-capture';
import { scrapingConfig } from './scraping-config';
import {
  htmlLooksLikeContinueShoppingShell,
  isAmazonShortLinkHost,
} from './resolve-scrape-final-url.util';

export class ScrapePlaywrightError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScrapePlaywrightError';
  }
}

export interface PlaywrightFetchResult {
  html: string;
  capturedJson: unknown[];
  finalUrl: string;
}

const CONTENT_SELECTORS = [
  'meta[property="og:title"]',
  'h1',
  '[itemprop="price"]',
  'script#__NEXT_DATA__',
  '[data-test="product-price"]',
  '#productTitle',
].join(', ');

async function tryDismissAmazonContinueShopping(page: {
  url: () => string;
  content: () => Promise<string>;
  locator: (selector: string) => {
    first: () => {
      isVisible: (opts?: { timeout?: number }) => Promise<boolean>;
      click: (opts?: { timeout?: number }) => Promise<void>;
    };
  };
  waitForSelector: (
    selector: string,
    opts?: { timeout?: number }
  ) => Promise<unknown>;
  waitForTimeout: (ms: number) => Promise<void>;
}): Promise<void> {
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

  const candidates = [
    'text=Continue shopping',
    'input[type="submit"]',
    'button:has-text("Continue")',
    'a:has-text("Continue shopping")',
  ];

  for (const selector of candidates) {
    try {
      const target = page.locator(selector).first();
      if (!(await target.isVisible({ timeout: 500 }))) continue;
      await target.click({ timeout: 2000 });
      await page.waitForSelector('#productTitle, meta[property="og:title"]', {
        timeout: 5000,
      }).catch(() => {});
      await page.waitForTimeout(300);
      return;
    } catch {
      /* try next CTA */
    }
  }
}

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

    const finalUrl = page.url() || url;
    return { html, capturedJson: capture.getPayloads(), finalUrl };
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
