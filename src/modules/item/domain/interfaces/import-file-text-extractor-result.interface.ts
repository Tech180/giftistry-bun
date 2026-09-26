import type { ImportFileFormat } from '../types/import-file-format.type';

export interface ImportFileTextExtractorResult {
  text: string;
  format: ImportFileFormat;
  warnings: string[];
  truncated: boolean;
}
