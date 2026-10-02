import type { ScrapeEvalFieldName } from './scrape-field-name.type';

export interface FieldAggregate {
  field: ScrapeEvalFieldName;
  scored: number;
  matched: number;
  matchRate: number;
}
