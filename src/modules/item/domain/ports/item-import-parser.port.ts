import type {
  ImportedItemPreview,
} from '../imported-item-preview';
import type { ImportFileFormat } from '../imported-item-preview';

export interface ItemImportParserInput {
  fileName: string;
  format: ImportFileFormat;
  fileContent: string;
  wishlistTitle?: string;
  existingCategories?: string;
  /** When false, instruct AI to keep file categories (except soft/general). Default true. */
  optimizeCategories?: boolean;
}

export interface ItemImportParserConfig {
  provider: string;
  apiKey: string;
  model: string;
  customPrompt: string;
  endpoint: string;
  /** When false, send the full file in one AI call. Default true. */
  chunkingEnabled?: boolean;
  /** Max candidate item rows per AI import chunk when chunking is enabled. */
  chunkItemLimit?: number;
}

export interface ItemImportParserProgress {
  tokensPerSecond: number | null;
  chunkIndex?: number;
  chunkTotal?: number;
}

export interface ItemImportParserResult {
  items: ImportedItemPreview[];
  warnings: string[];
}

export interface ItemImportParser {
  parse(
    input: ItemImportParserInput,
    config: ItemImportParserConfig,
    onProgress?: (progress: ItemImportParserProgress) => void | Promise<void>
  ): Promise<ItemImportParserResult>;
}
