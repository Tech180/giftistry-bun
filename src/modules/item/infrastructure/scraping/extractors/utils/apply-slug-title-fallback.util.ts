import type { ExtractionResult } from '../interfaces/extraction-result.interface';
import type { ExtractorContext } from '../interfaces/extractor-context.interface';
import { slugTitleExtractor } from '../slug-title.extractor';
import { computeConfidence } from '../../utils/compute-scrape-confidence.util';
import { isGenericTitle } from './is-generic-title.util';

export function applySlugTitleFallback(
  result: ExtractionResult,
  context: ExtractorContext
): ExtractionResult {
  if (!isGenericTitle(result.metadata.title)) return result;

  const slugResult = slugTitleExtractor.extract(context);
  if (!slugResult.title) return result;

  result.metadata.title = slugResult.title;
  result.titleFromSlug = true;
  result.confidence = computeConfidence(result.metadata, true);
  if (!result.fieldsFound.includes('title')) result.fieldsFound.push('title');

  return result;
}
