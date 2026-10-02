import type { ExtractorSource } from '../types/extractor-source.type';
import type { ScrapeFieldKey } from '../types/scrape-field-key.type';

export type ScrapeFieldSources = Partial<Record<ScrapeFieldKey, ExtractorSource>>;
