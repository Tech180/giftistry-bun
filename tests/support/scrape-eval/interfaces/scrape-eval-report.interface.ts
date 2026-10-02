import type { EntryReplayResult } from './entry-replay-result.interface';
import type { ScrapeEvalAggregates } from './scrape-eval-aggregates.interface';

export interface ScrapeEvalReport {
  version: 1;
  generatedAt: string;
  corpusRoot: string;
  entryCount: number;
  aggregates: ScrapeEvalAggregates;
  entries: EntryReplayResult[];
}
