import type { BucketAggregates } from './bucket-aggregates.interface';

export interface ScrapeEvalAggregates {
  overall: BucketAggregates;
  byPlatform: Record<string, BucketAggregates>;
  byTag: Record<string, BucketAggregates>;
}
