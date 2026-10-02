import type { ExtractedMetadata } from '../../../domain/interfaces/extracted-metadata.interface';
import type { ScrapeResult } from '../../../domain/interfaces/scrape-result.interface';

export interface ExtractPopulateStageInput {
  resolvedUrl: string;
  websiteName: string;
  pageContext: string;
  searchContext: string | undefined;
  scrapeWithFields: ExtractedMetadata;
  scrapeResult: ScrapeResult;
  scrapeApparelKey: string | null | undefined;
  resolvedCategory: string;
  resolvedAlternatives: string[];
  baseData: ExtractedMetadata;
}
