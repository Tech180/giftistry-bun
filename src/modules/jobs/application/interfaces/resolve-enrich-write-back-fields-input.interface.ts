import type {
  ExtractedMetadata,
  ItemDescriptionMetadata,
  ScrapeDiagnostics,
} from '@/modules/item';

export interface ResolveEnrichWriteBackFieldsInput {
  extract: ExtractedMetadata;
  diagnostics: ScrapeDiagnostics;
  current: {
    name: string;
    description: string | null;
    category: string | null;
    metadata?: ItemDescriptionMetadata | null;
  };
  fallbackUrl: string;
  finalUrl?: string | null;
  websiteName?: string | null;
  /** Used when scrape has no price (import rows keep CSV price). */
  priceFallback?: number | null;
  resolveCategory?: (extractCategory: string | null | undefined) => string | null;
}
