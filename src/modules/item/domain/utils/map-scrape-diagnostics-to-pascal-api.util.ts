import type { ScrapeDiagnostics } from '../interfaces/scrape-diagnostics.interface';

export function mapScrapeDiagnosticsToPascalApi(
  diagnostics: ScrapeDiagnostics
): Record<string, unknown> {
  return {
    Source: diagnostics.source,
    Confidence: diagnostics.confidence,
    FieldsFound: diagnostics.fieldsFound,
    AiPopulate: diagnostics.aiPopulate,
    Blocked: diagnostics.blocked,
    ValidationReason: diagnostics.validationReason,
    Outcome: diagnostics.outcome,
    NeedsReview: diagnostics.needsReview,
    Warnings: diagnostics.warnings,
    FieldSources: diagnostics.fieldSources,
    DroppedFields: diagnostics.droppedFields,
    QualityGate: diagnostics.qualityGate
      ? {
          Outcome: diagnostics.qualityGate.outcome,
          Reason: diagnostics.qualityGate.reason,
          PageType: diagnostics.qualityGate.pageType,
        }
      : undefined,
  };
}
