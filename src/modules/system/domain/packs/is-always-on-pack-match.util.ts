import type { MetadataPackMatch } from './metadata-pack.interface';

export function isAlwaysOnPackMatch(match: MetadataPackMatch): boolean {
  return match.categories.length === 0 && !(match.titleKeywords && match.titleKeywords.length > 0);
}
