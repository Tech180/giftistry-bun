import type { FetchPageResult } from '../interfaces/fetch-page-result.interface';
import { ScrapeFetchError } from '../errors/scrape-fetch-error';
import { scrapingConfig } from './scraping-config.util';
import { buildFetchHeaders } from './browser-headers.util';

export async function fetchPageHtml(
  url: string,
  timeoutMs = scrapingConfig.fetchTimeoutMs
): Promise<FetchPageResult> {
  const res = await fetch(url, {
    headers: buildFetchHeaders(url),
    signal: AbortSignal.timeout(timeoutMs),
    redirect: 'follow',
  });

  if (!res.ok) {
    throw new ScrapeFetchError(`HTTP ${res.status}`);
  }

  const html = await res.text();
  const finalUrl = (typeof res.url === 'string' && res.url.trim()) || url;
  return { html, finalUrl };
}
