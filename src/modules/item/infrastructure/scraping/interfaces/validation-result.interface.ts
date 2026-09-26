import type { ScrapeConfidence } from '../../../domain/types/scrape-confidence.type';

export interface ValidationResult {
  valid: boolean;
  reason?: string;
  blocked?: boolean;
  confidence?: ScrapeConfidence;
  fieldsFound?: string[];
}
