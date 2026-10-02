import type { ScrapeDiagnostics } from '../interfaces/scrape-diagnostics.interface';
import type { ScrapeFieldSources } from '../interfaces/scrape-field-sources.interface';
import type { ScrapeSource } from '../types/scrape-source.type';
import type { FetchOutcomeKind } from '../types/fetch-outcome-kind.type';
import type { QualityGateDiagnostics } from '../interfaces/scrape-diagnostics.interface';

export function buildPartialScrapeDiagnostics(input: {
  source: ScrapeSource;
  outcome: FetchOutcomeKind;
  fieldsFound: string[];
  validationReason?: string;
  blocked?: boolean;
  qualityGate?: QualityGateDiagnostics;
  fieldSources?: ScrapeFieldSources;
  extraWarnings?: string[];
}): ScrapeDiagnostics {
  const warnings = [...(input.extraWarnings ?? [])];
  if (input.validationReason) {
    warnings.push(input.validationReason);
  }
  return {
    source: input.source,
    confidence: 'low',
    fieldsFound: input.fieldsFound,
    blocked: input.blocked,
    validationReason: input.validationReason,
    outcome: input.outcome,
    needsReview: true,
    warnings: warnings.length ? warnings : undefined,
    qualityGate: input.qualityGate,
    fieldSources: input.fieldSources,
  };
}
