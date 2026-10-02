import type { ScrapeConfidence } from '../../../domain/types/scrape-confidence.type';
import type { QualityGateResult } from './quality-gate-result.interface';

export interface ValidationResult {
  valid: boolean;
  reason?: string;
  blocked?: boolean;
  confidence?: ScrapeConfidence;
  fieldsFound?: string[];
  qualityGate?: QualityGateResult;
}
