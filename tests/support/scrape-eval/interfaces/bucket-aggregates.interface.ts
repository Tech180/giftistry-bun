import type { FieldAggregate } from './field-aggregate.interface';

export interface BucketAggregates {
  entryCount: number;
  fields: FieldAggregate[];
}
