import { buildFetchHeaders } from './browser-headers';
import { scrapingConfig } from './scraping-config';

export class ScrapeFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScrapeFetchError';
  }
}

export async function fetchPageHtml(
  url: string,
  timeoutMs = scrapingConfig.fetchTimeoutMs
): Promise<string> {
  const res = await fetch(url, {
    headers: buildFetchHeaders(url),
    signal: AbortSignal.timeout(timeoutMs),
    redirect: 'follow',
  });

  if (!res.ok) {
    throw new ScrapeFetchError(`HTTP ${res.status}`);
  }

  return res.text();
}
