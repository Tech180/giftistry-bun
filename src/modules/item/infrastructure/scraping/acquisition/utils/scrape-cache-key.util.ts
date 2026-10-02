import { canonicalizeProductUrl } from '../../../../domain/utils/canonicalize-product-url.util';

export function buildScrapeCacheKey(url: string): string {
  return canonicalizeProductUrl(url);
}
