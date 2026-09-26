import type { MetadataExtractor } from '../../extractors/interfaces/metadata-extractor.interface';

export interface RetailerExtractor {
  hostnames: string[];
  priority: number;
  extract: MetadataExtractor['extract'];
}
