import type { ExtractorSource } from '../types/extractor-source.type';

export interface FieldValue<T> {
  value: T;
  /** 0–1 confidence for this observation. */
  confidence: number;
  source: ExtractorSource;
  evidence?: string;
}
