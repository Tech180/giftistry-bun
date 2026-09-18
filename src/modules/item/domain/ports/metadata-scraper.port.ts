import type { ExtractedMetadata, ScrapeDiagnostics, ScrapeMode } from '../extracted-metadata';

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

export interface MetadataScraper {
  scrape(url: string, mode?: ScrapeMode): Promise<ScrapeResult>;
}
