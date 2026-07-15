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
}

export interface ItemImportParserConfig {
  provider: string;
  apiKey: string;
  model: string;
  customPrompt: string;
  endpoint: string;
}

export interface ItemImportParser {
  parse(
    input: ItemImportParserInput,
    config: ItemImportParserConfig
  ): Promise<ImportedItemPreview[]>;
}
