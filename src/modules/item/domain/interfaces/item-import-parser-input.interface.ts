import type { ImportFileFormat } from '../types/import-file-format.type';

export interface ItemImportParserInput {
  fileName: string;
  format: ImportFileFormat;
  fileContent: string;
  wishlistTitle?: string;
  existingCategories?: string;
  /** When false, instruct AI to keep file categories (except soft/general). Default true. */
  optimizeCategories?: boolean;
}
