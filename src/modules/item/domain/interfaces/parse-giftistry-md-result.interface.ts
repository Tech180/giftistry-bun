import type { ImportedItemPreview } from './imported-item-preview.interface';

export interface ParseGiftistryMdResult {
  items: ImportedItemPreview[];
  warnings: string[];
  suggestedWishlistTitle?: string;
}
