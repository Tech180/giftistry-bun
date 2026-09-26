import type { MetadataPackFieldBucket } from '../types/metadata-pack-field-bucket.type';

export interface MetadataPackField {
  key: string;
  label: string;
  bucket: MetadataPackFieldBucket;
  hint?: string;
}
