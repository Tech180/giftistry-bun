import type { ExtractionResult } from './interfaces/extraction-result.interface';
import type { ExtractorContext } from './interfaces/extractor-context.interface';
import { applySlugTitleFallback } from './utils/apply-slug-title-fallback.util';
import { runExtractionPipeline } from './utils/merge-extraction.util';
import { resolveAbsoluteImageUrl } from './utils/resolve-absolute-image-url.util';
import { selectMetadataExtractors } from './utils/select-metadata-extractors.util';

export function extractMetadata(context: ExtractorContext): ExtractionResult {
  const extractors = selectMetadataExtractors(context);
  const result = runExtractionPipeline(extractors, context);
  const withSlug = applySlugTitleFallback(result, context);
  const absoluteImage = resolveAbsoluteImageUrl(
    withSlug.metadata.imageUrl,
    context.url,
    context.html
  );
  if (absoluteImage === withSlug.metadata.imageUrl) {
    return withSlug;
  }
  return {
    ...withSlug,
    metadata: { ...withSlug.metadata, imageUrl: absoluteImage },
  };
}

export function parseMetadata(
  html: string,
  url: string,
  mode: 'full' | 'minimal' = 'full',
  capturedJson: unknown[] = []
) {
  return extractMetadata({ html, url, mode, capturedJson }).metadata;
}
