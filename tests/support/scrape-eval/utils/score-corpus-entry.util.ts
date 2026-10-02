import type { ExtractedMetadata } from '../../../../src/modules/item/domain/interfaces/extracted-metadata.interface';
import type { ValidationResult } from '../../../../src/modules/item/infrastructure/scraping/interfaces/validation-result.interface';
import type { CorpusEntry } from '../interfaces/corpus-entry.interface';
import type { EntryReplayResult } from '../interfaces/entry-replay-result.interface';
import { matchExpectedFields } from './match-expected-fields.util';

export function scoreCorpusEntry(
  entry: CorpusEntry,
  metadata: ExtractedMetadata,
  validation: ValidationResult
): EntryReplayResult {
  const { meta, expected } = entry;
  const tags = meta.tags ?? [];

  const blockedExpectationMet = expected.shouldBeBlocked
    ? validation.blocked === true
    : undefined;

  const fields =
    expected.shouldBeBlocked && blockedExpectationMet
      ? []
      : matchExpectedFields(expected, metadata);

  return {
    id: meta.id,
    platform: meta.platform,
    tags,
    url: meta.url,
    validation: {
      valid: validation.valid,
      blocked: validation.blocked,
      reason: validation.reason,
      confidence: validation.confidence,
    },
    blockedExpectationMet,
    fields,
  };
}
