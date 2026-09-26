import type { ExtractedMetadata } from '../../../../domain/interfaces/extracted-metadata.interface';
import {
  computeConfidence,
  computeFieldsFound,
} from '../../utils/compute-scrape-confidence.util';
import type { ExtractionResult } from '../interfaces/extraction-result.interface';
import type { MetadataExtractor } from '../interfaces/metadata-extractor.interface';
import type { PartialExtraction } from '../interfaces/partial-extraction.interface';
import { detectCategoryFromUrlAndTitle } from './detect-category.util';

function pickField<T>(current: T | null | undefined, next: T | null | undefined): T | null {
  if (next === null || next === undefined || next === '') return current ?? null;
  return next;
}

function mergePartials(
  partials: Array<{ priority: number; partial: PartialExtraction }>,
  mode: 'full' | 'minimal'
): { metadata: ExtractedMetadata; titleFromSlug: boolean } {
  const sorted = [...partials].sort((a, b) => a.priority - b.priority);
  let titleFromSlug = false;

  const merged: ExtractedMetadata = {
    title: '',
    price: null,
    description: null,
    color: null,
    size: null,
    category: null,
    imageUrl: null,
    userDefinedFields: {},
  };

  for (const { partial } of sorted) {
    merged.title = pickField(merged.title, partial.title) ?? merged.title;
    if (partial.title && partial.title === merged.title) {
      titleFromSlug = Boolean(partial.titleFromSlug);
    }
    merged.price = pickField(merged.price, partial.price);
    merged.description = pickField(merged.description, partial.description);
    merged.imageUrl = pickField(merged.imageUrl, partial.imageUrl);
    if (mode === 'full') {
      merged.color = pickField(merged.color, partial.color);
      merged.size = pickField(merged.size, partial.size);
      merged.category = pickField(merged.category, partial.category);
      if (partial.userDefinedFields) {
        merged.userDefinedFields = {
          ...(merged.userDefinedFields ?? {}),
          ...partial.userDefinedFields,
        };
      }
    }
  }

  if (merged.userDefinedFields && Object.keys(merged.userDefinedFields).length === 0) {
    delete merged.userDefinedFields;
  }

  if (!merged.title) merged.title = '';

  return { metadata: merged, titleFromSlug };
}

export function runExtractionPipeline(
  extractors: MetadataExtractor[],
  context: Parameters<MetadataExtractor['extract']>[0]
): ExtractionResult {
  const partials = extractors.map((extractor) => ({
    priority: extractor.priority,
    partial: extractor.extract(context),
  }));

  const { metadata, titleFromSlug } = mergePartials(partials, context.mode);

  if (context.mode === 'full' && !metadata.category) {
    metadata.category = detectCategoryFromUrlAndTitle(context.url, metadata.title);
  }

  const fieldsFound = computeFieldsFound(metadata);
  if (context.mode === 'full' && metadata.category && !fieldsFound.includes('category')) {
    fieldsFound.push('category');
  }

  return {
    metadata,
    fieldsFound,
    titleFromSlug,
    confidence: computeConfidence(metadata, titleFromSlug),
  };
}
