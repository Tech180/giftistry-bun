import type { ScrapeSource } from '../types/scrape-source.type';
import type { ScrapeConfidence } from '../types/scrape-confidence.type';
import type { AiPopulateStatus } from '../types/ai-populate-status.type';
import type { FetchOutcomeKind } from '../types/fetch-outcome-kind.type';
import type { PageType } from '../types/page-type.type';
import type { ScrapeFieldSources } from './scrape-field-sources.interface';

export type QualityGateOutcome = 'accept' | 'ai-assist' | 'escalate' | 'fail';

export type QualityGateReason =
  | 'strong-product-page'
  | 'partial-fields'
  | 'low-confidence'
  | 'non-product-page'
  | 'blocked-signals'
  | 'missing-title'
  | 'slug-title-only';

export interface QualityGateDiagnostics {
  outcome: QualityGateOutcome;
  reason: QualityGateReason;
  pageType?: PageType;
}

export interface ScrapeDiagnostics {
  source: ScrapeSource;
  confidence: ScrapeConfidence;
  fieldsFound: string[];
  validationReason?: string;
  blocked?: boolean;
  /** Set when extract-metadata considers AI populate. */
  aiPopulate?: AiPopulateStatus;
  outcome?: FetchOutcomeKind;
  qualityGate?: QualityGateDiagnostics;
  /** AI populate fields removed for lacking evidence overlap. */
  droppedFields?: string[];
  /** Human should verify fields before trusting enrich output. */
  needsReview?: boolean;
  /** Non-fatal scrape notes (validation reason, partial policy, etc.). */
  warnings?: string[];
  /** Best-known extractor source per core field. */
  fieldSources?: ScrapeFieldSources;
}
