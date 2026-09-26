import type { EnrichExtractSnapshot } from '../interfaces/enrich-extract-snapshot.interface';

export function buildEnrichJobResult(
  extract: EnrichExtractSnapshot,
  fallbackUrl: string
): Record<string, unknown> {
  return {
    Title: extract.data.title,
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
    Diagnostics: {
      Source: extract.diagnostics.source,
      Confidence: extract.diagnostics.confidence,
      FieldsFound: extract.diagnostics.fieldsFound,
      AiPopulate: extract.diagnostics.aiPopulate,
    },
  };
}
