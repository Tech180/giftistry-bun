import type { FetchPageResult } from '../interfaces/fetch-page-result.interface';
import { ScrapeFetchError } from '../errors/scrape-fetch-error';
import { scrapingConfig } from './scraping-config.util';
import { buildFetchHeaders } from './browser-headers.util';
import { safeFetch, UnsafeUrlError } from './safe-fetch.util';

/**
 * Fetch page HTML. Non-2xx responses return status+body instead of throwing
 * so callers can classify (404 short-circuit, 403 escalate, etc.).
 */
export async function fetchPageHtml(
  url: string,
  timeoutMs = scrapingConfig.fetchTimeoutMs
): Promise<FetchPageResult> {
  try {
    const result = await safeFetch(url, {
      timeoutMs,
      headers: buildFetchHeaders(url),
      maxBytes: scrapingConfig.maxHtmlBytes,
    });

    return {
      html: result.body,
      finalUrl: result.finalUrl,
      status: result.status,
    };
  } catch (err) {
    if (err instanceof UnsafeUrlError) {
      throw new ScrapeFetchError(err.message, 0);
    }
    throw err;
  }
}
