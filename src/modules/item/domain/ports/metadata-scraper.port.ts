import type { ScrapeMode } from '../types/scrape-mode.type';
import type { ScrapeResult } from '../interfaces/scrape-result.interface';

export interface MetadataScraper {
  scrape(url: string, mode?: ScrapeMode): Promise<ScrapeResult>;
}
