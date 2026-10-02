import type { ExtractorSource } from '../../../../domain/types/extractor-source.type';

export function extractorNameToSource(name: string): ExtractorSource {
  if (name.startsWith('retailer:')) {
    return 'retailer';
  }
  switch (name) {
    case 'json-ld':
      return 'json-ld';
    case 'embedded-json':
      return 'embedded-json';
    case 'meta':
      return 'meta';
    case 'dom':
      return 'dom';
    case 'slug':
      return 'slug';
    default:
      return 'unknown';
  }
}
