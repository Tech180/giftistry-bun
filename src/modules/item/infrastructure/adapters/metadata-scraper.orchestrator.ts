import type { MetadataScraper } from '../../domain/ports/metadata-scraper.port';
import type { ScrapeResult } from '../../domain/interfaces/scrape-result.interface';
import type { ScrapeMode } from '../../domain/types/scrape-mode.type';
import type { ScrapeSource } from '../../domain/types/scrape-source.type';
import type { FetchPageResult } from '../scraping/interfaces/fetch-page-result.interface';
import type { PlaywrightFetchResult } from '../scraping/interfaces/playwright-fetch-result.interface';
import { extractMetadata } from '../scraping/extractors/extraction-pipeline';
import { fetchPageHtml } from '../scraping/utils/fetch-page-html.util';
import { ScrapeFetchError } from '../scraping/errors/scrape-fetch-error';
import { playwrightFetchPage } from '../scraping/utils/playwright-fetch-page.util';
import { ScrapeError } from '../scraping/errors/scrape-error';
import { validateScrapeResult } from '../scraping/utils/validate-scrape-result.util';
import { resolveScrapeFinalUrl } from '../scraping/utils/resolve-scrape-final-url.util';
import {
  extractOgSiteName,
  resolveWebsiteName,
} from '../scraping/extractors/utils/resolve-website-name.util';
import { logScrape } from '../utils/log-scrape.util';

type FetchHtmlFn = (url: string) => Promise<FetchPageResult>;
type PlaywrightFetchFn = (url: string) => Promise<PlaywrightFetchResult>;

export class MetadataScraperOrchestrator implements MetadataScraper {
  constructor(
    private readonly fetchHtml: FetchHtmlFn = fetchPageHtml,
    private readonly browserFetch: PlaywrightFetchFn = playwrightFetchPage
  ) {}

  async scrape(url: string, mode: ScrapeMode = 'full'): Promise<ScrapeResult> {
    let lastReason: string | undefined;
    let lastBlocked = false;

    try {
      const { html, finalUrl: rawFinal } = await this.fetchHtml(url);
      const finalUrl = resolveScrapeFinalUrl(rawFinal, url);
      if (!finalUrl) {
        throw new ScrapeFetchError('Unsafe final URL after redirect');
      }
      const extraction = extractMetadata({ html, url: finalUrl, mode });
      const validation = validateScrapeResult(extraction.metadata, html, mode, {
        titleFromSlug: extraction.titleFromSlug,
      });

      if (validation.valid && extraction.confidence !== 'low') {
        logScrape(url, 'fetch', 'succeeded', {
          confidence: extraction.confidence,
          fields: validation.fieldsFound?.join(','),
          finalUrl,
        });
        return this.buildResult(extraction, 'fetch', validation, finalUrl, html);
      }

      lastReason = validation.reason;
      lastBlocked = validation.blocked ?? false;
      logScrape(url, 'fetch', `invalid reason=${validation.reason}`, {
        blocked: lastBlocked,
        finalUrl,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (err instanceof ScrapeFetchError && (message.includes('403') || message.includes('429'))) {
        lastBlocked = true;
      }
      lastReason = message;
      logScrape(url, 'fetch', `failed error=${message}`, { blocked: lastBlocked });
    }

    const { html, capturedJson, finalUrl: rawFinal } = await this.browserFetch(url);
    const finalUrl = resolveScrapeFinalUrl(rawFinal, url);
    if (!finalUrl) {
      throw new ScrapeError(`Both strategies failed: unsafe final URL after redirect`, {
        blocked: lastBlocked,
        validationReason: lastReason,
      });
    }
    const extraction = extractMetadata({ html, url: finalUrl, mode, capturedJson });
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
      finalUrl,
    });

    return this.buildResult(extraction, 'playwright', validation, finalUrl, html);
  }

  private buildResult(
    extraction: ReturnType<typeof extractMetadata>,
    source: ScrapeSource,
    validation: ReturnType<typeof validateScrapeResult>,
    finalUrl: string,
    html: string
  ): ScrapeResult {
    const websiteName = resolveWebsiteName(finalUrl, {
      ogSiteName: extractOgSiteName(html),
    });
    return {
      data: extraction.metadata,
      diagnostics: {
        source,
        confidence: validation.confidence ?? extraction.confidence,
        fieldsFound: validation.fieldsFound ?? extraction.fieldsFound,
        blocked: validation.blocked,
      },
      finalUrl,
      websiteName: websiteName || undefined,
      html,
    };
  }
}
