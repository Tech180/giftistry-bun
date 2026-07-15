const GENERIC_SUBDOMAINS = new Set(['shop', 'store', 'www', 'm', 'mobile', 'checkout', 'buy']);

export interface WebsiteNameHints {
  ogSiteName?: string | null;
  brand?: string | null;
  vendor?: string | null;
}

export function resolveWebsiteNameFromUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    const parts = hostname.split('.').filter(Boolean);
    if (parts.length === 0) return '';

    let label = parts[0] ?? '';
    if (GENERIC_SUBDOMAINS.has(label.toLowerCase()) && parts.length > 1) {
      label = parts[1] ?? label;
    }

    return label ? label.charAt(0).toUpperCase() + label.slice(1) : '';
  } catch {
    return '';
  }
}

export function resolveWebsiteName(url: string, hints: WebsiteNameHints = {}): string {
  const brand = hints.brand?.trim();
  if (brand) return brand;

  const vendor = hints.vendor?.trim();
  if (vendor) return vendor;

  const ogSiteName = hints.ogSiteName?.trim();
  if (ogSiteName && !GENERIC_SUBDOMAINS.has(ogSiteName.toLowerCase())) {
    return ogSiteName;
  }

  return resolveWebsiteNameFromUrl(url);
}

export function extractOgSiteName(html: string): string | null {
  const match =
    html.match(/<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:site_name["']/i);
  return match?.[1]?.trim() || null;
}
