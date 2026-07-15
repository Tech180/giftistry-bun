import type { ExtractedMetadata, ScrapeDiagnostics, ScrapeMode } from '../extracted-metadata';

export interface ScrapeResult {
  data: ExtractedMetadata;
  diagnostics: ScrapeDiagnostics;
  websiteName?: string;
}

export interface MetadataScraper {
  scrape(url: string, mode?: ScrapeMode): Promise<ScrapeResult>;
}
