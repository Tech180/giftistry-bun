import type { MetadataScraper, ScrapeResult } from '../domain/ports/metadata-scraper.port';
import type { ScrapeMode, ScrapeSource } from '../domain/extracted-metadata';
import { extractMetadata } from './scraping/extractors/extraction-pipeline';
import { fetchPageHtml, ScrapeFetchError } from './scraping/fetch-scraper';
import { playwrightFetchPage } from './scraping/playwright-scraper';
import { validateScrapeResult } from './scraping/validators';

export class ScrapeError extends Error {
  readonly diagnostics?: {
    blocked?: boolean;
    validationReason?: string;
  };

  constructor(
    message: string,
    diagnostics?: { blocked?: boolean; validationReason?: string }
  ) {
    super(message);
    this.name = 'ScrapeError';
    this.diagnostics = diagnostics;
  }
}

type FetchHtmlFn = (url: string) => Promise<string>;
type PlaywrightFetchFn = (url: string) => Promise<{ html: string; capturedJson: unknown[] }>;

function logScrape(
  url: string,
  tier: ScrapeSource,
  message: string,
  extra?: Record<string, string | boolean | number | undefined>
): void {
  const parts = [`[Scraper] url=${url}`, `tier=${tier}`, message];
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value !== undefined) parts.push(`${key}=${String(value)}`);
    }
  }
  console.log(parts.join(' '));
}

export class MetadataScraperOrchestrator implements MetadataScraper {
  constructor(
    private readonly fetchHtml: FetchHtmlFn = fetchPageHtml,
    private readonly browserFetch: PlaywrightFetchFn = playwrightFetchPage
  ) {}

  async scrape(url: string, mode: ScrapeMode = 'full'): Promise<ScrapeResult> {
    let lastReason: string | undefined;
    let lastBlocked = false;

    try {
      const html = await this.fetchHtml(url);
      const extraction = extractMetadata({ html, url, mode });
      const validation = validateScrapeResult(extraction.metadata, html, mode, {
        titleFromSlug: extraction.titleFromSlug,
      });

      if (validation.valid && extraction.confidence !== 'low') {
        logScrape(url, 'fetch', 'succeeded', {
          confidence: extraction.confidence,
          fields: validation.fieldsFound?.join(','),
        });
        return this.buildResult(extraction, 'fetch', validation);
      }

      lastReason = validation.reason;
      lastBlocked = validation.blocked ?? false;
      logScrape(url, 'fetch', `invalid reason=${validation.reason}`, { blocked: lastBlocked });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (err instanceof ScrapeFetchError && (message.includes('403') || message.includes('429'))) {
        lastBlocked = true;
      }
      lastReason = message;
      logScrape(url, 'fetch', `failed error=${message}`, { blocked: lastBlocked });
    }

    const { html, capturedJson } = await this.browserFetch(url);
    const extraction = extractMetadata({ html, url, mode, capturedJson });
    const validation = validateScrapeResult(extraction.metadata, html, mode, {
      titleFromSlug: extraction.titleFromSlug,
    });

    if (!validation.valid) {
      throw new ScrapeError(`Both strategies failed: ${validation.reason ?? lastReason}`, {
        blocked: validation.blocked ?? lastBlocked,
        validationReason: validation.reason ?? lastReason,
      });
    }

    logScrape(url, 'playwright', 'succeeded', {
      confidence: extraction.confidence,
      fields: validation.fieldsFound?.join(','),
      capturedJson: capturedJson.length,
    });

    return this.buildResult(extraction, 'playwright', validation);
  }

  private buildResult(
    extraction: ReturnType<typeof extractMetadata>,
    source: ScrapeSource,
    validation: ReturnType<typeof validateScrapeResult>
  ): ScrapeResult {
    return {
      data: extraction.metadata,
      diagnostics: {
        source,
        confidence: validation.confidence ?? extraction.confidence,
        fieldsFound: validation.fieldsFound ?? extraction.fieldsFound,
        blocked: validation.blocked,
      },
    };
  }
}

// Backward-compatible export name
export const CheerioPlaywrightMetadataScraper = MetadataScraperOrchestrator;
