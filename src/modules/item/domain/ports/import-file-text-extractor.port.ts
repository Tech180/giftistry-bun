import type { ImportFileFormat } from '../imported-item-preview';

export type ImportContentEncoding = 'text' | 'base64' | 'data-url';

export interface ImportFileTextExtractorInput {
  fileName: string;
  format?: ImportFileFormat;
  content: string;
  contentEncoding: ImportContentEncoding;
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
