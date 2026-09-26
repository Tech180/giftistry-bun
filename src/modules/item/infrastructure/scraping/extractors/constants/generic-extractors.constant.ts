import { domFallbackExtractor } from '../dom-fallback.extractor';
import { embeddedJsonExtractor } from '../embedded-json.extractor';
import { jsonLdExtractor } from '../json-ld.extractor';
import { metaTagExtractor } from '../meta-tag.extractor';
import { slugTitleExtractor } from '../slug-title.extractor';
import type { MetadataExtractor } from '../interfaces/metadata-extractor.interface';

export const GENERIC_EXTRACTORS: MetadataExtractor[] = [
  jsonLdExtractor,
  embeddedJsonExtractor,
  metaTagExtractor,
  domFallbackExtractor,
  slugTitleExtractor,
];
