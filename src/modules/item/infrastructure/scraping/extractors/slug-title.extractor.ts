import type { MetadataExtractor } from './interfaces/metadata-extractor.interface';
import { extractTitleFromSlug } from './utils/extract-title-from-slug.util';

export const slugTitleExtractor: MetadataExtractor = {
  name: 'slug-title',
  priority: 10,
  extract({ url }) {
    const title = extractTitleFromSlug(url);
    if (!title) return {};
    return { title, titleFromSlug: true };
  },
};
