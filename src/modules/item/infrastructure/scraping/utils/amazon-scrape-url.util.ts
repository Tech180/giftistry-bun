import type { FetchPageResult } from '../interfaces/fetch-page-result.interface';
import { resolveScrapeFinalUrl } from '../../../domain/utils/scrape-url-safety.util';
import { fetchPageHtml } from './fetch-page-html.util';

type FetchHtmlFn = (url: string) => Promise<FetchPageResult>;

/**
 * Follow redirects for scrape URL discovery. Does not validate product HTML.
 * Returns null finalUrl when the landed location is unsafe.
 */
export async function resolveScrapeRedirectUrl(
  url: string,
  fetchHtml: FetchHtmlFn = fetchPageHtml
): Promise<{ html: string; finalUrl: string | null }> {
  const { html, finalUrl: rawFinal } = await fetchHtml(url);
  return { html, finalUrl: resolveScrapeFinalUrl(rawFinal, url) };
}

export {
  buildAmazonProductUrl,
  canonicalizeAmazonProductUrl,
  isAmazonProductPageUrl,
  isAmazonScrapeUrl,
  parseAmazonAsinFromHtml,
  parseAmazonAsinFromUrl,
  resolveAmazonProductTargetUrl,
} from '../../../domain/utils/amazon-url.util';
