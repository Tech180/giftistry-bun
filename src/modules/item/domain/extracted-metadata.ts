export type ScrapeMode = 'full' | 'minimal';
export type ScrapeSource = 'fetch' | 'playwright';
export type ScrapeConfidence = 'high' | 'medium' | 'low';

export interface ExtractedMetadata {
  title: string;
  price: number | null;
  description: string | null;
  color: string | null;
  size: string | null;
  category: string | null;
  categoryAlternatives?: string[];
  imageUrl: string | null;
  predefinedFields?: Record<string, string>;
  userDefinedFields?: Record<string, string>;
  /** Pack / multi-buy quantity when > 1 (from AI or title parse). */
  desiredQuantity?: number | null;
}

export interface ScrapeDiagnostics {
  source: ScrapeSource;
  confidence: ScrapeConfidence;
  fieldsFound: string[];
  validationReason?: string;
  blocked?: boolean;
}
