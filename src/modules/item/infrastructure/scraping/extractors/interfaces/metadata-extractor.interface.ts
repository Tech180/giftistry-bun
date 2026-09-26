import type { PartialExtraction } from './partial-extraction.interface';
import type { ExtractorContext } from './extractor-context.interface';

export interface MetadataExtractor {
  name: string;
  priority: number;
  extract(context: ExtractorContext): PartialExtraction;
}
