import type { ItemDescriptionMetadata } from './item-description-metadata.interface';
export interface ParsedItemDescription {
  text: string | null;
  metadata: ItemDescriptionMetadata | null;
  isJson: boolean;
}
