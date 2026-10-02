export function isShopifyProductPageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return /\/products\/[^/]+/.test(parsed.pathname);
  } catch {
    return false;
  }
}

export function resolveShopifyProductJsUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/products\/([^/?#]+)/i);
    if (!match?.[1]) return null;
    const handle = decodeURIComponent(match[1]);
    return `${parsed.origin}/products/${encodeURIComponent(handle)}.js`;
  } catch {
    return null;
  }
}
