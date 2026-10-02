import type { BucketAggregates } from '../interfaces/bucket-aggregates.interface';
import type { EntryReplayResult } from '../interfaces/entry-replay-result.interface';
import type { FieldAggregate } from '../interfaces/field-aggregate.interface';
import type { ScrapeEvalAggregates } from '../interfaces/scrape-eval-aggregates.interface';
import { SCRAPE_EVAL_FIELDS } from '../interfaces/scrape-field-name.type';

function emptyFieldAggregates(): FieldAggregate[] {
  return SCRAPE_EVAL_FIELDS.map((field) => ({
    field,
    scored: 0,
    matched: 0,
    matchRate: 1,
  }));
}

function accumulateFields(
  fields: FieldAggregate[],
  entry: EntryReplayResult
): void {
  for (const result of entry.fields) {
    if (result.skipped) {
      continue;
    }
    const bucket = fields.find((f) => f.field === result.field);
    if (!bucket) {
      continue;
    }
    bucket.scored += 1;
    if (result.matched) {
      bucket.matched += 1;
    }
  }
}

function finalizeRates(fields: FieldAggregate[]): FieldAggregate[] {
  return fields.map((f) => ({
    ...f,
    matchRate: f.scored === 0 ? 1 : f.matched / f.scored,
  }));
}

function bucketFromEntries(entries: EntryReplayResult[]): BucketAggregates {
  const fields = emptyFieldAggregates();
  for (const entry of entries) {
    accumulateFields(fields, entry);
  }
  return {
    entryCount: entries.length,
    fields: finalizeRates(fields),
  };
}

export function aggregateFieldScores(entries: EntryReplayResult[]): ScrapeEvalAggregates {
  const overall = bucketFromEntries(entries);

  const byPlatform: Record<string, BucketAggregates> = {};
  for (const entry of entries) {
    const list = byPlatform[entry.platform] ?? [];
    list.push(entry);
    byPlatform[entry.platform] = list;
  }

  const byTag: Record<string, BucketAggregates> = {};
  for (const entry of entries) {
    for (const tag of entry.tags) {
      const list = byTag[tag] ?? [];
      list.push(entry);
      byTag[tag] = list;
    }
  }

  return {
    overall,
    byPlatform: Object.fromEntries(
      Object.entries(byPlatform).map(([k, v]) => [k, bucketFromEntries(v)])
    ),
    byTag: Object.fromEntries(Object.entries(byTag).map(([k, v]) => [k, bucketFromEntries(v)])),
  };
}
