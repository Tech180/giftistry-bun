import { DomainError } from '@/common/domain/errors/domain-error';
import { assertScrapeUrlSafe } from './scrape-url-safety.util';

/** Edge validation for scrape/enrich entry points. Maps to HTTP 400. */
export function assertSafeScrapeUrlOrThrow(url: string): void {
  try {
    assertScrapeUrlSafe(url);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid URL';
    throw new DomainError(message, 'VALIDATION');
  }
}
