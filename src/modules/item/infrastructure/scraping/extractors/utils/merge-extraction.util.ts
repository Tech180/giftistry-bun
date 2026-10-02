import type { ExtractedMetadata } from '../../../../domain/interfaces/extracted-metadata.interface';
import type { ExtractorSource } from '../../../../domain/types/extractor-source.type';
import {
  computeConfidence,
  computeFieldsFound,
} from '../../utils/compute-scrape-confidence.util';
import type { ExtractionResult } from '../interfaces/extraction-result.interface';
import type { MetadataExtractor } from '../interfaces/metadata-extractor.interface';
import type { PartialExtraction } from '../interfaces/partial-extraction.interface';
import { detectCategoryFromUrlAndTitle } from './detect-category.util';
import { extractorNameToSource } from './extractor-name-to-source.util';

function pickField<T>(current: T | null | undefined, next: T | null | undefined): T | null {
  if (next === null || next === undefined || next === '') return current ?? null;
  return next;
}

function assignFieldSource(
  fieldSources: NonNullable<ExtractedMetadata['fieldSources']>,
  key: keyof NonNullable<ExtractedMetadata['fieldSources']>,
  source: ExtractorSource,
  value: unknown
): void {
  if (value == null || value === '') {
    return;
  }
  if (!fieldSources[key]) {
    fieldSources[key] = source;
  }
}

function mergePartials(
  partials: Array<{ priority: number; partial: PartialExtraction; source: ExtractorSource }>,
  mode: 'full' | 'minimal'
): { metadata: ExtractedMetadata; titleFromSlug: boolean } {
  const sorted = [...partials].sort((a, b) => a.priority - b.priority);
  let titleFromSlug = false;
  const fieldSources: NonNullable<ExtractedMetadata['fieldSources']> = {};

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

  for (const { partial, source } of sorted) {
    const prevTitle = merged.title;
    merged.title = pickField(merged.title, partial.title) ?? merged.title;
    if (partial.title && merged.title === partial.title && prevTitle !== merged.title) {
      assignFieldSource(fieldSources, 'title', source, partial.title);
    }
    if (partial.title && partial.title === merged.title) {
      titleFromSlug = Boolean(partial.titleFromSlug);
      if (partial.titleFromSlug) {
        assignFieldSource(fieldSources, 'title', 'slug', partial.title);
      }
    }

    const prevPrice = merged.price;
    merged.price = pickField(merged.price, partial.price);
    if (partial.price != null && merged.price === partial.price && prevPrice !== merged.price) {
      assignFieldSource(fieldSources, 'price', source, partial.price);
    }

    const prevDescription = merged.description;
    merged.description = pickField(merged.description, partial.description);
    if (
      partial.description &&
      merged.description === partial.description &&
      prevDescription !== merged.description
    ) {
      assignFieldSource(fieldSources, 'description', source, partial.description);
    }

    const prevImage = merged.imageUrl;
    merged.imageUrl = pickField(merged.imageUrl, partial.imageUrl);
    if (
      partial.imageUrl &&
      merged.imageUrl === partial.imageUrl &&
      prevImage !== merged.imageUrl
    ) {
      assignFieldSource(fieldSources, 'image', source, partial.imageUrl);
    }
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

  if (Object.keys(fieldSources).length > 0) {
    merged.fieldSources = fieldSources;
  }

  return { metadata: merged, titleFromSlug };
}

export function runExtractionPipeline(
  extractors: MetadataExtractor[],
  context: Parameters<MetadataExtractor['extract']>[0]
): ExtractionResult {
  const partials = extractors.map((extractor) => ({
    priority: extractor.priority,
    partial: extractor.extract(context),
    source: extractorNameToSource(extractor.name),
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
