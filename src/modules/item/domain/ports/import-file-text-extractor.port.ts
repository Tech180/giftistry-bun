import type { ImportFileFormat } from '../imported-item-preview';

export type ImportContentEncoding = 'text' | 'base64' | 'data-url';

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

export interface ImportFileTextExtractorResult {
  text: string;
  format: ImportFileFormat;
  warnings: string[];
  truncated: boolean;
}

export interface ImportFileTextExtractor {
  extract(input: ImportFileTextExtractorInput): Promise<ImportFileTextExtractorResult>;
}
