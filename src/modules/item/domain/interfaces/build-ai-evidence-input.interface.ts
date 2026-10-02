import type { AiMetadataExtractionOptions } from '@/modules/system';
import type { ExtractedMetadata } from './extracted-metadata.interface';

export interface BuildAiEvidenceInput {
  html: string;
  url: string;
  scrape?: ExtractedMetadata;
  extraction: Pick<AiMetadataExtractionOptions, 'pageContextMaxChars'>;
}
