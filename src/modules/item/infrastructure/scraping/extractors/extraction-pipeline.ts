import { domFallbackExtractor } from './dom-fallback.extractor';
import { embeddedJsonExtractor } from './embedded-json.extractor';
import { jsonLdExtractor } from './json-ld.extractor';
import { metaTagExtractor, isGenericTitle } from './meta-tag.extractor';
import { runExtractionPipeline, computeConfidence } from './merge';
import { slugTitleExtractor } from './slug-title.extractor';
import type { ExtractionResult, ExtractorContext, MetadataExtractor } from './types';
import { amazonExtractor } from '../retailers/amazon.extractor';
import { dicksExtractor } from '../retailers/dicks.extractor';
import { matchRetailer } from '../retailers/retailer-registry';
import { shopifyExtractor } from '../retailers/shopify.extractor';
import { targetExtractor } from '../retailers/target.extractor';
import { walmartExtractor } from '../retailers/walmart.extractor';

const RETAILER_EXTRACTORS = [
  amazonExtractor,
  walmartExtractor,
  targetExtractor,
  dicksExtractor,
  shopifyExtractor,
];

const GENERIC_EXTRACTORS: MetadataExtractor[] = [
  jsonLdExtractor,
  embeddedJsonExtractor,
  metaTagExtractor,
  domFallbackExtractor,
  slugTitleExtractor,
];

function retailerToExtractor(retailer: (typeof RETAILER_EXTRACTORS)[number]): MetadataExtractor {
  return {
    name: `retailer:${retailer.hostnames[0]}`,
    priority: retailer.priority,
    extract: retailer.extract,
  };
}

export function extractMetadata(context: ExtractorContext): ExtractionResult {
  let extractors = [...GENERIC_EXTRACTORS];

  try {
    const hostname = new URL(context.url).hostname;
    const retailer = matchRetailer(hostname, RETAILER_EXTRACTORS);
    if (retailer) {
      extractors = [retailerToExtractor(retailer), ...GENERIC_EXTRACTORS];
    } else if (hostname.includes('shopify') || context.html.includes('cdn.shopify.com')) {
      extractors = [retailerToExtractor(shopifyExtractor), ...GENERIC_EXTRACTORS];
    }
  } catch {
    // invalid URL — generic extractors only
  }

  const result = runExtractionPipeline(extractors, context);

  if (isGenericTitle(result.metadata.title)) {
    const slugResult = slugTitleExtractor.extract(context);
    if (slugResult.title) {
      result.metadata.title = slugResult.title;
      result.titleFromSlug = true;
      result.confidence = computeConfidence(result.metadata, true);
      if (!result.fieldsFound.includes('title')) result.fieldsFound.push('title');
    }
  }

  return result;
}

// Backward-compatible alias used by tests and parser re-exports
export function parseMetadata(
  html: string,
  url: string,
  mode: 'full' | 'minimal' = 'full',
  capturedJson: unknown[] = []
) {
  return extractMetadata({ html, url, mode, capturedJson }).metadata;
}

export { extractTitleFromSlug } from './slug-title.extractor';
export { isGenericTitle } from './meta-tag.extractor';
