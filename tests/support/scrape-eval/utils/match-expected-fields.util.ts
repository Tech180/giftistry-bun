import type { ExtractedMetadata } from '../../../../src/modules/item/domain/interfaces/extracted-metadata.interface';
import type { CorpusExpected } from '../interfaces/corpus-expected.interface';
import type { FieldMatchResult } from '../interfaces/field-match-result.interface';
import { matchImageHostField } from '../matchers/match-image-host.util';
import { matchPriceField } from '../matchers/match-price.util';
import { matchTitleCandidates } from '../matchers/match-title-candidates.util';

export function matchExpectedFields(
  expected: CorpusExpected,
  actual: ExtractedMetadata
): FieldMatchResult[] {
  if (expected.shouldBeBlocked || expected.pageType !== 'product') {
    return [];
  }

  return [
    matchTitleCandidates(expected.title, actual.title),
    matchPriceField(expected.price, actual.price),
    matchImageHostField(expected.imageHost, actual.imageUrl),
  ];
}
