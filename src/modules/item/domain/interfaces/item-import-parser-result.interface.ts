import type { ImportedItemPreview } from './imported-item-preview.interface';

export interface ItemImportParserResult {
  items: ImportedItemPreview[];
  warnings: string[];
}
