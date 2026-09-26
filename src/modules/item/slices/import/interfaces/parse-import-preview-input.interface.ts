import type { ImportContentEncoding } from '../../../domain/types/import-content-encoding.type';
import type { ImportFileFormat } from '../../../domain/types/import-file-format.type';

export interface ParseImportPreviewInput {
  listId?: string;
  fileName: string;
  format?: ImportFileFormat;
  content: string;
  contentEncoding: ImportContentEncoding;
  /** When false, do not fall back to AI after deterministic parse fails. Default true. */
  allowAi?: boolean;
  /**
   * When false, instruct AI to preserve file categories (except soft/general).
   * Default true.
   */
  optimizeCategories?: boolean;
}
