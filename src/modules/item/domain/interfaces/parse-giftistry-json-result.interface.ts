import type { ImportedItemPreview } from './imported-item-preview.interface';

export interface ParseGiftistryJsonResult {
  items: ImportedItemPreview[];
  warnings: string[];
  suggestedWishlistTitle?: string;
}
