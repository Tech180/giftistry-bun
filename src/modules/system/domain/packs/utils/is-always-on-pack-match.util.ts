import type { MetadataPackMatch } from '../interfaces/metadata-pack-match.interface';

export function isAlwaysOnPackMatch(match: MetadataPackMatch): boolean {
  return match.categories.length === 0 && !(match.titleKeywords && match.titleKeywords.length > 0);
}
