import { AMAZON_HOST_SUFFIXES } from '../constants/amazon-host-suffixes.constant';
import { AMAZON_SHORT_HOSTS } from '../constants/amazon-short-hosts.constant';
import { ASIN_IN_HTML_RE } from '../constants/amazon-asin-in-html.constant';
import { ASIN_PATH_RE } from '../constants/amazon-asin-path.constant';

export function isAmazonProductHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^www\./, '');
  return AMAZON_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`)
  );
}

export function isAmazonShortLinkHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^www\./, '');
  return AMAZON_SHORT_HOSTS.has(host);
}

export function isAmazonScrapeUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return isAmazonProductHost(hostname) || isAmazonShortLinkHost(hostname);
  } catch {
    return false;
  }
}

export function parseAmazonAsinFromUrl(url: string): string | null {
  try {
    const pathname = new URL(url).pathname;
    const match = pathname.match(ASIN_PATH_RE);
    return match?.[1]?.toUpperCase() ?? null;
  } catch {
    return null;
  }
}

/** True when URL path is a product page with a parseable ASIN. */
export function isAmazonProductPageUrl(url: string): boolean {
  return parseAmazonAsinFromUrl(url) != null;
}

/** Best-effort ASIN extraction from gate/redirect HTML. */
export function parseAmazonAsinFromHtml(html: string): string | null {
  if (!html) {
    return null;
  }

  ASIN_IN_HTML_RE.lastIndex = 0;
  const match = ASIN_IN_HTML_RE.exec(html);
  const asin = match?.[1] || match?.[2];
  return asin ? asin.toUpperCase() : null;
}

export function buildAmazonProductUrl(asin: string, localeHost = 'www.amazon.com'): string {
  const host = localeHost.replace(/^https?:\/\//, '').replace(/\/$/, '') || 'www.amazon.com';
  return `https://${host}/dp/${asin.toUpperCase()}`;
}

/** Prefer a canonical /dp/{ASIN} URL when ASIN is known. */
export function canonicalizeAmazonProductUrl(url: string): string {
  const asin = parseAmazonAsinFromUrl(url);
  if (!asin) {
    return url;
  }

  try {
    const host = new URL(url).hostname;
    if (isAmazonShortLinkHost(host)) {
      return buildAmazonProductUrl(asin);
    }
    return buildAmazonProductUrl(asin, host.startsWith('www.') ? host : `www.${host}`);
  } catch {
    return buildAmazonProductUrl(asin);
  }
}

/**
 * Resolve a product scrape target from a redirect candidate and/or HTML.
 * Returns null for decoy hubs (category, browse, grocery) with no ASIN.
 */
export function resolveAmazonProductTargetUrl(
  candidateUrl: string,
  html?: string
): string | null {
  const trimmed = candidateUrl.trim();
  if (trimmed && isAmazonProductPageUrl(trimmed)) {
    return canonicalizeAmazonProductUrl(trimmed);
  }

  const asinFromHtml = html ? parseAmazonAsinFromHtml(html) : null;
  if (asinFromHtml) {
    let localeHost = 'www.amazon.com';
    if (trimmed) {
      try {
        const host = new URL(trimmed).hostname;
        if (host && !isAmazonShortLinkHost(host)) {
          localeHost = host.startsWith('www.') ? host : `www.${host}`;
        }
      } catch {
        /* default host */
      }
    }
    return buildAmazonProductUrl(asinFromHtml, localeHost);
  }

  return null;
}
