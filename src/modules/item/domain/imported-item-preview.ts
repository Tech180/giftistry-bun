export type ImportFileFormat = 'csv' | 'xlsx' | 'txt' | 'json' | 'md' | 'pdf' | 'unknown';

export type ImportParseMode = 'deterministic' | 'ai';

export interface ImportedItemCustomFields {
  Predefined: Record<string, string>;
  UserDefined: Record<string, string>;
}

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
  customFields?: ImportedItemCustomFields;
}

export interface ImportPreviewResult {
  items: ImportedItemPreview[];
  warnings: string[];
  sourceFormat: ImportFileFormat;
  parseMode: ImportParseMode;
  suggestedWishlistTitle?: string;
}
