import type { ScrapeEvalFieldName } from './scrape-field-name.type';

export interface FieldMatchResult {
  field: ScrapeEvalFieldName;
  matched: boolean;
  score?: number;
  expected?: string | number | null;
  actual?: string | number | null;
  skipped?: boolean;
  reason?: string;
}
