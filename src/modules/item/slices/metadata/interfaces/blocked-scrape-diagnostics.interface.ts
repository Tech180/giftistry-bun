import type { ScrapeSource } from '../../../domain/types/scrape-source.type';

export interface BlockedScrapeDiagnostics {
  blocked?: boolean;
  validationReason?: string;
  finalUrl?: string;
  tier?: ScrapeSource;
}
