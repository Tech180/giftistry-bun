import type { ScrapeDiagnostics } from '@/modules/item';
import { mapScrapeDiagnosticsToPascalApi } from '@/modules/item';
import { sanitizeProductTitleForWrite } from '@/modules/item';
import type { EnrichExtractSnapshot } from '../interfaces/enrich-extract-snapshot.interface';

export function buildEnrichJobResult(
  extract: EnrichExtractSnapshot,
  fallbackUrl: string
): Record<string, unknown> {
  const diagnostics = extract.diagnostics as ScrapeDiagnostics;
  return {
    Title: sanitizeProductTitleForWrite(extract.data.title),
    Price: extract.data.price,
    Description: extract.data.description,
    Category: extract.data.category,
    CategoryAlternatives: extract.data.categoryAlternatives ?? [],
    ImageUrl: extract.data.imageUrl,
    WebsiteName: extract.websiteName ?? null,
    ResolvedUrl: extract.finalUrl ?? fallbackUrl,
    CustomFields: {
      Predefined: extract.data.predefinedFields ?? {},
      UserDefined: extract.data.userDefinedFields ?? {},
    },
    Diagnostics: mapScrapeDiagnosticsToPascalApi(diagnostics),
  };
}
