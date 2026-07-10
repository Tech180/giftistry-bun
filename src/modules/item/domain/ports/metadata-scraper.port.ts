import type { ExtractedMetadata, ScrapeMode, ScrapeSource } from '../extracted-metadata';

export interface ScrapeResult {
  data: ExtractedMetadata;
  source: ScrapeSource;
}

export interface MetadataScraper {
  scrape(url: string, mode?: ScrapeMode): Promise<ScrapeResult>;
}
