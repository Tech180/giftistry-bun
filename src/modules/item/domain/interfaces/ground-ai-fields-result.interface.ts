import type { ExtractedMetadata } from './extracted-metadata.interface';

export interface GroundAiFieldsResult {
  metadata: ExtractedMetadata;
  droppedFields: string[];
}
