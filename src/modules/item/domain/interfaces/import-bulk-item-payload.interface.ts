import type { ItemDescriptionMetadata } from './item-description-metadata.interface';

export interface ImportBulkItemPayload {
  description: string | null;
  metadata: ItemDescriptionMetadata | null;
}
