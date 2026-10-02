import { isPrivateNetworkAddress } from './is-private-network-address.util';

/**
 * Textual URL safety checks for product scrapes (no DNS or network I/O).
 * Rejects credentials and private/localhost host literals.
 */
export function resolveScrapeFinalUrl(
  candidate: string | null | undefined,
  fallbackInputUrl: string
): string | null {
  const raw = candidate?.trim() || fallbackInputUrl.trim() || '';
  if (!raw) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return null;
  }
  if (parsed.username || parsed.password) {
    return null;
  }
  if (!parsed.hostname) {
    return null;
  }
  if (isPrivateNetworkAddress(parsed.hostname)) {
    return null;
  }

  return parsed.href;
}

/** Throws DomainError-compatible message when the URL is not safe to scrape. */
export function assertScrapeUrlSafe(url: string): URL {
  const trimmed = url.trim();
  if (!trimmed) {
    throw new Error('URL is required');
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error('Invalid URL format');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http and https URLs are allowed');
  }
  if (parsed.username || parsed.password) {
    throw new Error('URLs with credentials are not allowed');
  }
  if (!parsed.hostname) {
    throw new Error('URL missing hostname');
  }
  if (isPrivateNetworkAddress(parsed.hostname)) {
    throw new Error('Private or local network URLs are not allowed');
  }

  return parsed;
}
