import { CATEGORY_KEYWORDS } from '../../../domain/category-keywords';
import type { ExtractedMetadata, ScrapeConfidence } from '../../../domain/extracted-metadata';
import type { ExtractionResult, MetadataExtractor, MetadataField, PartialExtraction } from './types';

const FIELD_PRIORITY: MetadataField[] = [
  'title',
  'price',
  'description',
  'imageUrl',
  'color',
  'size',
  'category',
];

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

const COMPILED_CATEGORY_REGEXES = Object.entries(CATEGORY_KEYWORDS).map(([cat, keywords]) => {
  const escapedKeywords = keywords
    .map((kw) => kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');
  return {
    category: cat,
    regex: new RegExp(`\\b(${escapedKeywords})\\b`, 'i'),
  };
});

function detectCategory(url: string, title: string): string | null {
  try {
    const urlObj = new URL(url);
    const host = urlObj.hostname.toLowerCase();
    const path = urlObj.pathname.toLowerCase();
    const textToScan = `${host} ${path} ${title.toLowerCase()}`;

    for (const { category, regex } of COMPILED_CATEGORY_REGEXES) {
      if (regex.test(textToScan)) return category;
    }
  } catch {
    // ignore invalid URLs
  }
  return null;
}

export function computeFieldsFound(metadata: ExtractedMetadata): MetadataField[] {
  const found: MetadataField[] = [];
  for (const field of FIELD_PRIORITY) {
    const value = metadata[field];
    if (field === 'price') {
      if (value !== null) found.push(field);
    } else if (typeof value === 'string' && value.trim()) {
      found.push(field);
    }
  }
  return found;
}

export function computeConfidence(
  metadata: ExtractedMetadata,
  titleFromSlug: boolean
): ScrapeConfidence {
  const hasTitle = Boolean(metadata.title?.trim());
  const hasPrice = metadata.price !== null;
  const hasDescription = Boolean(metadata.description?.trim());
  const hasImage = Boolean(metadata.imageUrl?.trim());

  if (titleFromSlug && !hasPrice && !hasDescription) return 'low';
  if (hasTitle && hasPrice && (hasDescription || hasImage)) return 'high';
  if (hasTitle && (hasPrice || hasDescription || hasImage)) return 'medium';
  return 'low';
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
    metadata.category = detectCategory(context.url, metadata.title);
    if (metadata.category) {
      // category detected post-merge
    }
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
