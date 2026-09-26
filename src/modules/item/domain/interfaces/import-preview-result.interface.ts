import type { ImportFileFormat } from '../types/import-file-format.type';
import type { ImportParseMode } from '../types/import-parse-mode.type';
import type { ImportedItemPreview } from './imported-item-preview.interface';
export interface ImportPreviewResult {
  items: ImportedItemPreview[];
  warnings: string[];
  sourceFormat: ImportFileFormat;
  parseMode: ImportParseMode;
  suggestedWishlistTitle?: string;
  /** True when extractor truncated file text before parsing. */
  inputTruncated?: boolean;
  /** Rough non-empty data-row estimate used for under-count checks. */
  estimatedRowCount?: number;
}
