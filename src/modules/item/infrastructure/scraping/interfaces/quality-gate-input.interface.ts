import type { ExtractedMetadata } from '../../../domain/interfaces/extracted-metadata.interface';
import type { ScrapeConfidence } from '../../../domain/types/scrape-confidence.type';

export interface QualityGateInput {
  metadata: ExtractedMetadata;
  html: string;
  confidence: ScrapeConfidence;
  validationValid: boolean;
  validationReason?: string;
  blocked?: boolean;
  titleFromSlug?: boolean;
  httpStatus?: number;
}
