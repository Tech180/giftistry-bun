import type { ImportedItemPreview } from './imported-item-preview.interface';

export interface ParseGiftistryTxtResult {
  items: ImportedItemPreview[];
  warnings: string[];
  suggestedWishlistTitle?: string;
}
