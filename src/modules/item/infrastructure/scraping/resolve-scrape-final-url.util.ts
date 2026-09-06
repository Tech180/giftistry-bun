/**
 * Normalize and validate the URL landed on after redirects during product scrape.
 * Allows http(s) for product pages; rejects credentials and private/localhost hosts.
 */
export function isPrivateScrapeHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (
    host === 'localhost' ||
    host === 'metadata.google.internal' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local')
  ) {
    return true;
  }

  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const parts = ipv4.slice(1).map((p) => Number(p));
    if (parts.some((n) => !Number.isFinite(n) || n < 0 || n > 255)) return true;
    const [a, b] = parts;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    return false;
  }

  if (host === '::1' || host === '0:0:0:0:0:0:0:1') return true;
  if (host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80')) return true;
  if (host.includes('127.0.0.1')) return true;

  return false;
}

/**
 * Returns a safe canonical scrape URL, or null if the final location is unsafe.
 */
export function resolveScrapeFinalUrl(
  candidate: string | null | undefined,
  fallbackInputUrl: string
): string | null {
  const raw = (candidate?.trim() || fallbackInputUrl.trim() || '');
  if (!raw) return null;

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
  if (parsed.username || parsed.password) return null;
  if (!parsed.hostname) return null;
  if (isPrivateScrapeHostname(parsed.hostname)) return null;

  return parsed.href;
}

const AMAZON_SHORT_HOSTS = new Set(['a.co', 'amzn.to', 'amzn.com']);

export function isAmazonShortLinkHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^www\./, '');
  return AMAZON_SHORT_HOSTS.has(host);
}

export function htmlLooksLikeContinueShoppingShell(html: string): boolean {
  const lower = html.toLowerCase();
  return (
    lower.includes('continue shopping') ||
    lower.includes('click the button below to continue')
  );
}
