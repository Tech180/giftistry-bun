import type { ImportedItemPreview } from './imported-item-preview.interface';

export interface ParseGiftistryCsvResult {
  items: ImportedItemPreview[];
  warnings: string[];
}
