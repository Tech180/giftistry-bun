import type { ScrapeResult } from '../../domain/interfaces/scrape-result.interface';
import { mapScrapeDiagnosticsToPascalApi } from '../../domain/utils/map-scrape-diagnostics-to-pascal-api.util';

export function mapScrapeResultToApi(result: ScrapeResult, fallbackUrl: string) {
  return {
    Title: result.data.title,
    Price: result.data.price,
    Description: result.data.description,
    Category: result.data.category,
    CategoryAlternatives: result.data.categoryAlternatives ?? [],
    ImageUrl: result.data.imageUrl,
    WebsiteName: result.websiteName ?? null,
    ResolvedUrl: result.finalUrl ?? fallbackUrl,
    CustomFields: {
      Predefined: result.data.predefinedFields ?? {},
      UserDefined: result.data.userDefinedFields ?? {},
    },
    Diagnostics: mapScrapeDiagnosticsToPascalApi(result.diagnostics),
  };
}
