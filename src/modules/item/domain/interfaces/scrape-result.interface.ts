import type { ExtractedMetadata } from './extracted-metadata.interface';
import type { ScrapeDiagnostics } from './scrape-diagnostics.interface';

export interface ScrapeResult {
  data: ExtractedMetadata;
  diagnostics: ScrapeDiagnostics;
  websiteName?: string;
  /** Canonical URL after redirects; equals input when unchanged. */
  finalUrl?: string;
  /**
   * Successful scrape HTML when available.
   * Reused for AI page context so we do not re-fetch (Amazon often blocks the second fetch).
   */
  html?: string;
}
