import {
  KEEP_QUERY_KEYS,
  STRIP_QUERY_KEYS,
  STRIP_QUERY_PREFIXES,
} from '../constants/canonicalize-product-url.constant';

function shouldStripQueryKey(key: string): boolean {
  const lower = key.toLowerCase();
  if (KEEP_QUERY_KEYS.has(lower)) return false;
  if (STRIP_QUERY_KEYS.has(lower)) return true;
  return STRIP_QUERY_PREFIXES.some((prefix) => lower.startsWith(prefix));
}

/**
 * Normalize product URLs for cache keys and scraping: drop tracking params,
 * keep variant / sku / color / size.
 */
export function canonicalizeProductUrl(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return url;
  }

  const kept = new URLSearchParams();
  for (const [key, value] of parsed.searchParams.entries()) {
    if (!shouldStripQueryKey(key)) {
      kept.append(key, value);
    }
  }
  parsed.search = kept.toString() ? `?${kept.toString()}` : '';
  parsed.hash = '';
  return parsed.href;
}
