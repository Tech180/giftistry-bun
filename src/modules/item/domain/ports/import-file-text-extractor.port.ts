import type { ImportFileTextExtractorInput } from '../interfaces/import-file-text-extractor-input.interface';
import type { ImportFileTextExtractorResult } from '../interfaces/import-file-text-extractor-result.interface';

export interface ImportFileTextExtractor {
  extract(input: ImportFileTextExtractorInput): Promise<ImportFileTextExtractorResult>;
}
