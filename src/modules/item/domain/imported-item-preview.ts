export type ImportFileFormat = 'csv' | 'xlsx' | 'txt' | 'json' | 'pdf' | 'unknown';

export type ImportParseMode = 'deterministic' | 'ai';

export interface ImportedItemPreview {
  name: string;
  category?: string;
  priority?: number;
  description?: string;
  price?: number | null;
  websiteLink?: string;
  isFavorite?: boolean;
  color?: string;
  size?: string;
  desiredQuantity?: number;
}

export interface ImportPreviewResult {
  items: ImportedItemPreview[];
  warnings: string[];
  sourceFormat: ImportFileFormat;
  parseMode: ImportParseMode;
  suggestedWishlistTitle?: string;
}
