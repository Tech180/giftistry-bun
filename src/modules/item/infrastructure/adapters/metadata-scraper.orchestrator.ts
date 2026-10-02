import type { MetadataScraper } from '../../domain/ports/metadata-scraper.port';
import type { ScrapeResult } from '../../domain/interfaces/scrape-result.interface';
import type { ScrapeMode } from '../../domain/types/scrape-mode.type';
import type { ScrapeSource } from '../../domain/types/scrape-source.type';
import type { FetchPageResult } from '../scraping/interfaces/fetch-page-result.interface';
import type { PlaywrightFetchResult } from '../scraping/interfaces/playwright-fetch-result.interface';
import { extractMetadata } from '../scraping/extractors/extraction-pipeline';
import { fetchPageHtml } from '../scraping/utils/fetch-page-html.util';
import { ScrapeFetchError } from '../scraping/errors/scrape-fetch-error';
import {
  playwrightFetchPage,
  type PlaywrightFetchPageOptions,
} from '../scraping/utils/playwright-fetch-page.util';
import { ScrapeError } from '../scraping/errors/scrape-error';
import { validateScrapeResult } from '../scraping/utils/validate-scrape-result.util';
import {
  isAmazonShortLinkHost,
  resolveScrapeFinalUrl,
} from '../scraping/utils/resolve-scrape-final-url.util';
import {
  isAmazonProductPageUrl,
  isAmazonScrapeUrl,
  parseAmazonAsinFromUrl,
  canonicalizeAmazonProductUrl,
  resolveAmazonProductTargetUrl,
  resolveScrapeRedirectUrl,
} from '../scraping/utils/amazon-scrape-url.util';
import {
  extractOgSiteName,
  resolveWebsiteName,
} from '../scraping/extractors/utils/resolve-website-name.util';
import { logScrape } from '../utils/log-scrape.util';

type FetchHtmlFn = (url: string) => Promise<FetchPageResult>;
type PlaywrightFetchFn = (
  url: string,
  timeoutMs?: number,
  options?: PlaywrightFetchPageOptions
) => Promise<PlaywrightFetchResult>;

export class MetadataScraperOrchestrator implements MetadataScraper {
  constructor(
    private readonly fetchHtml: FetchHtmlFn = fetchPageHtml,
    private readonly browserFetch: PlaywrightFetchFn = playwrightFetchPage
  ) {}

  async scrape(url: string, mode: ScrapeMode = 'full'): Promise<ScrapeResult> {
    let lastReason: string | undefined;
    let lastBlocked = false;
    let effectiveUrl = url;
    const amazonTarget = isAmazonScrapeUrl(url);

    if (amazonTarget) {
      const asinInInput = parseAmazonAsinFromUrl(url);
      if (asinInInput) {
        effectiveUrl = canonicalizeAmazonProductUrl(url);
        logScrape(url, 'fetch', 'pre-resolve skipped asin-in-url', {
          finalUrl: effectiveUrl,
        });
      } else {
        try {
          const redirected = await resolveScrapeRedirectUrl(url, this.fetchHtml);
          const productTarget = resolveAmazonProductTargetUrl(
            redirected.finalUrl ?? '',
            redirected.html
          );
          if (productTarget) {
            effectiveUrl = productTarget;
            logScrape(url, 'fetch', 'pre-resolve', {
              finalUrl: effectiveUrl,
              postGateUrl: effectiveUrl !== url ? effectiveUrl : undefined,
            });
          } else {
            effectiveUrl = url;
            logScrape(url, 'fetch', 'pre-resolve ignored non-product redirect', {
              finalUrl: redirected.finalUrl ?? undefined,
            });
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          logScrape(url, 'fetch', `pre-resolve failed error=${message}`);
        }
      }
    }

    if (!amazonTarget) {
      try {
        const { html, finalUrl: rawFinal } = await this.fetchHtml(url);
        const finalUrl = resolveScrapeFinalUrl(rawFinal, url);
        if (!finalUrl) {
          throw new ScrapeFetchError('Unsafe final URL after redirect');
        }
        const extraction = extractMetadata({ html, url: finalUrl, mode });
        const validation = validateScrapeResult(extraction.metadata, html, mode, {
          titleFromSlug: extraction.titleFromSlug,
          url: finalUrl,
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
    } else {
      logScrape(url, 'fetch', 'skipped reason=amazon');
    }

    let shortLinkInput = false;
    try {
      shortLinkInput = isAmazonShortLinkHost(new URL(url).hostname);
    } catch {
      shortLinkInput = false;
    }

    const playwrightUrl = amazonTarget && shortLinkInput ? url : effectiveUrl;
    const postGateUrl =
      amazonTarget &&
      effectiveUrl !== playwrightUrl &&
      isAmazonProductPageUrl(effectiveUrl)
        ? effectiveUrl
        : undefined;

    const fallbackForErrors = shortLinkInput
      ? url
      : isAmazonProductPageUrl(effectiveUrl)
        ? effectiveUrl
        : url;

    const { html, capturedJson, finalUrl: rawFinal } = await this.browserFetch(
      playwrightUrl,
      undefined,
      postGateUrl ? { postGateUrl } : undefined
    );
    const finalUrl = resolveScrapeFinalUrl(rawFinal, fallbackForErrors);
    if (!finalUrl) {
      throw new ScrapeError(`Both strategies failed: unsafe final URL after redirect`, {
        blocked: lastBlocked,
        validationReason: lastReason,
        finalUrl: fallbackForErrors !== url ? fallbackForErrors : undefined,
        tier: 'playwright',
      });
    }

    if (amazonTarget && !isAmazonProductPageUrl(finalUrl)) {
      throw new ScrapeError(`Both strategies failed: amazon-non-product-landing`, {
        blocked: true,
        validationReason: 'amazon-non-product-landing',
        finalUrl: fallbackForErrors,
        tier: 'playwright',
      });
    }

    const extraction = extractMetadata({ html, url: finalUrl, mode, capturedJson });
    const validation = validateScrapeResult(extraction.metadata, html, mode, {
      titleFromSlug: extraction.titleFromSlug,
      url: finalUrl,
    });

    if (!validation.valid) {
      throw new ScrapeError(`Both strategies failed: ${validation.reason ?? lastReason}`, {
        blocked: validation.blocked ?? lastBlocked,
        validationReason: validation.reason ?? lastReason,
        finalUrl: amazonTarget && !isAmazonProductPageUrl(finalUrl) ? fallbackForErrors : finalUrl,
        tier: 'playwright',
      });
    }

    logScrape(url, 'playwright', 'succeeded', {
      confidence: extraction.confidence,
      fields: validation.fieldsFound?.join(','),
      capturedJson: capturedJson.length,
      finalUrl,
      postGateUrl,
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
        validationReason: validation.reason,
      },
      finalUrl,
      websiteName: websiteName || undefined,
      html,
    };
  }
}
