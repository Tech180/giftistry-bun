import type { ScrapeSource } from '../types/scrape-source.type';
import type { ScrapeConfidence } from '../types/scrape-confidence.type';
import type { AiPopulateStatus } from '../types/ai-populate-status.type';
export interface ScrapeDiagnostics {
  source: ScrapeSource;
  confidence: ScrapeConfidence;
  fieldsFound: string[];
  validationReason?: string;
  blocked?: boolean;
  /** Set when extract-metadata considers AI populate. */
  aiPopulate?: AiPopulateStatus;
}
