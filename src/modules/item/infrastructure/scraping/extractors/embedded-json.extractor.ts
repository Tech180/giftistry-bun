import type { MetadataExtractor } from './interfaces/metadata-extractor.interface';
import { extractEmbeddedJsonFromHtml } from './utils/embedded-json.util';

export const embeddedJsonExtractor: MetadataExtractor = {
  name: 'embedded-json',
  priority: 45,
  extract({ html, mode, capturedJson = [] }) {
    return extractEmbeddedJsonFromHtml(html, mode, capturedJson);
  },
};
