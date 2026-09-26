import type { ImportContentEncoding } from '../types/import-content-encoding.type';
import type { ImportFileFormat } from '../types/import-file-format.type';

export interface ImportFileTextExtractorInput {
  fileName: string;
  format?: ImportFileFormat;
  content: string;
  contentEncoding: ImportContentEncoding;
  /** When set, only the first N worksheets are converted (XLSX only). */
  maxSheets?: number;
  /** When set, stop after N `<row>` elements per sheet (XLSX only). */
  maxRowsPerSheet?: number;
}
