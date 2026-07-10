import { playwrightManager } from './playwright-manager';

export class ScrapePlaywrightError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScrapePlaywrightError';
  }
}

export async function playwrightFetchHtml(url: string, timeoutMs = 15000): Promise<string> {
  const context = await playwrightManager.acquire();

  try {
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    await page
      .waitForSelector('meta[property="og:title"], title', { timeout: 2000 })
      .catch(() => {});

    const html = await page.content();
    if (!html) {
      throw new ScrapePlaywrightError('Empty page content');
    }

    return html;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Playwright scrape failed';
    throw new ScrapePlaywrightError(message);
  } finally {
    await playwrightManager.release(context);
  }
}
