import type { ExtractedMetadata } from '../../../../domain/interfaces/extracted-metadata.interface';
import type { ScrapeConfidence } from '../../../../domain/types/scrape-confidence.type';
import type { MetadataField } from './metadata-field.type';

export interface ExtractionResult {
  metadata: ExtractedMetadata;
  fieldsFound: MetadataField[];
  titleFromSlug: boolean;
  confidence: ScrapeConfidence;
}
