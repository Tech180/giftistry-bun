import type { ExtractedMetadata, ScrapeConfidence } from '../../../domain/extracted-metadata';

export type MetadataField = keyof ExtractedMetadata;

export interface PartialExtraction {
  title?: string | null;
  price?: number | null;
  description?: string | null;
  color?: string | null;
  size?: string | null;
  category?: string | null;
  imageUrl?: string | null;
  userDefinedFields?: Record<string, string>;
  titleFromSlug?: boolean;
}

export interface ExtractionResult {
  metadata: ExtractedMetadata;
  fieldsFound: MetadataField[];
  titleFromSlug: boolean;
  confidence: ScrapeConfidence;
}

export interface ExtractorContext {
  html: string;
  url: string;
  mode: 'full' | 'minimal';
  capturedJson?: unknown[];
}

export interface MetadataExtractor {
  name: string;
  priority: number;
  extract(context: ExtractorContext): PartialExtraction;
}
