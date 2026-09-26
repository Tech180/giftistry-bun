import type { ItemImportParserInput } from '../interfaces/item-import-parser-input.interface';
import type { ItemImportParserConfig } from '../interfaces/item-import-parser-config.interface';
import type { ItemImportParserProgress } from '../interfaces/item-import-parser-progress.interface';
import type { ItemImportParserResult } from '../interfaces/item-import-parser-result.interface';

export interface ItemImportParser {
  parse(
    input: ItemImportParserInput,
    config: ItemImportParserConfig,
    onProgress?: (progress: ItemImportParserProgress) => void | Promise<void>
  ): Promise<ItemImportParserResult>;
}
