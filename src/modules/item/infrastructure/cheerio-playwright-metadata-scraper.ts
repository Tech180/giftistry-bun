import type { MetadataScraper, ScrapeResult } from '../../domain/ports/metadata-scraper.port';
import type { ScrapeMode } from '../../domain/extracted-metadata';
import { fetchPageHtml } from './scraping/fetch-scraper';
import { parseMetadata } from './scraping/parser';
import { validateScrapeResult } from './scraping/validators';
import { playwrightFetchHtml } from './scraping/playwright-scraper';

export class ScrapeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScrapeError';
  }
}

type HtmlFetcher = (url: string) => Promise<string>;

export class CheerioPlaywrightMetadataScraper implements MetadataScraper {
  constructor(
    private readonly fetchHtml: HtmlFetcher = fetchPageHtml,
    private readonly browserFetchHtml: HtmlFetcher = playwrightFetchHtml
  ) {}

  async scrape(url: string, mode: ScrapeMode = 'full'): Promise<ScrapeResult> {
    try {
      const html = await this.fetchHtml(url);
      const data = parseMetadata(html, url, mode);
      const validation = validateScrapeResult(data, html, mode);

      if (validation.valid) {
        console.log(`[Scraper] fetch succeeded for ${url}`);
        return { data, source: 'fetch' };
      }

      console.log(
        `[Scraper] fetch invalid (${validation.reason}), falling back to Playwright for ${url}`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`[Scraper] fetch failed (${message}), falling back to Playwright for ${url}`);
    }

    const html = await this.browserFetchHtml(url);
    const data = parseMetadata(html, url, mode);
    const validation = validateScrapeResult(data, html, mode);

    if (!validation.valid) {
      throw new ScrapeError(`Both strategies failed: ${validation.reason}`);
    }

    console.log(`[Scraper] playwright succeeded for ${url}`);
    return { data, source: 'playwright' };
  }
}
