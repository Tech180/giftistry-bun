import type { ScrapeSource } from '../../domain/types/scrape-source.type';

export function logScrape(
  url: string,
  tier: ScrapeSource,
  message: string,
  extra?: Record<string, string | boolean | number | undefined>
): void {
  const parts = [`[Scraper] url=${url}`, `tier=${tier}`, message];
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value !== undefined) {
        parts.push(`${key}=${String(value)}`);
      }
    }
  }
  console.log(parts.join(' '));
}
