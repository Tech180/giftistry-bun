import type { ScrapeEvalFieldName } from './scrape-field-name.type';

export type FieldThresholdMap = Partial<Record<ScrapeEvalFieldName, { minMatchRate: number }>>;

export interface ScrapeEvalThresholds {
  overall: FieldThresholdMap;
  byPlatform?: Record<string, FieldThresholdMap>;
  byTag?: Record<string, FieldThresholdMap>;
}
