import { buildPartialScrapeDiagnostics } from '../../../domain/utils/build-partial-scrape-diagnostics.util';
import { hasPartialScrapeSignal } from '../../../domain/utils/has-partial-scrape-signal.util';
import { metadataFieldSourcesForDiagnostics } from '../../../domain/utils/metadata-field-sources.util';
import { resolvePartialScrapeOutcome } from '../../../domain/utils/resolve-partial-scrape-outcome.util';
import type { ScrapeResult } from '../../../domain/interfaces/scrape-result.interface';
import type { ScrapeSource } from '../../../domain/types/scrape-source.type';
import type { FetchOutcomeKind } from '../../../domain/types/fetch-outcome-kind.type';
import type { ValidationResult } from '../../scraping/interfaces/validation-result.interface';
import type { ExtractionResult } from '../../scraping/extractors/interfaces/extraction-result.interface';
import {
  extractOgSiteName,
  resolveWebsiteName,
} from '../../scraping/extractors/utils/resolve-website-name.util';
import { sanitizeProductTitleForWrite } from '../../../domain/utils/sanitize-product-title-for-write.util';

export function resolvePartialScrapeResult(input: {
  extraction: ExtractionResult;
  validation: ValidationResult;
  source: ScrapeSource;
  finalUrl: string;
  html: string;
  blockedHint?: boolean;
}): ScrapeResult | null {
  if (!hasPartialScrapeSignal(input.extraction.metadata)) {
    return null;
  }

  const blocked = input.validation.blocked ?? input.blockedHint ?? false;
  const outcome = resolvePartialScrapeOutcome(blocked);
  const fieldsFound =
    input.validation.fieldsFound ??
    input.extraction.fieldsFound.map((field) => String(field));

  const metadata = { ...input.extraction.metadata };
  const sanitizedTitle = sanitizeProductTitleForWrite(metadata.title);
  metadata.title = sanitizedTitle ?? '';

  return {
    data: metadata,
    diagnostics: buildPartialScrapeDiagnostics({
      source: input.source,
      outcome,
      fieldsFound,
      validationReason: input.validation.reason,
      blocked,
      qualityGate: input.validation.qualityGate,
      fieldSources: metadataFieldSourcesForDiagnostics(input.extraction.metadata),
    }),
    finalUrl: input.finalUrl,
    html: input.html,
    websiteName:
      resolveWebsiteName(input.finalUrl, { ogSiteName: extractOgSiteName(input.html) }) || undefined,
  };
}

export function terminalScrapeErrorOutcome(outcome?: FetchOutcomeKind): boolean {
  return outcome === 'unsafe-url' || outcome === 'not-found';
}
