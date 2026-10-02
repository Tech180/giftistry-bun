/** Resolve a possibly-relative image URL against page base / final URL. */
export function resolveAbsoluteImageUrl(
  imageUrl: string | null | undefined,
  pageUrl: string,
  html?: string
): string | null {
  const raw = imageUrl?.trim();
  if (!raw) {
    return null;
  }
  if (/^https?:\/\//i.test(raw) || raw.startsWith('data:')) {
    return raw;
  }

  let baseHref = pageUrl;
  if (html) {
    const match = html.match(/<base[^>]+href=["']([^"']+)["']/i);
    if (match?.[1]) {
      try {
        baseHref = new URL(match[1], pageUrl).href;
      } catch {
        /* keep pageUrl */
      }
    }
  }

  try {
    return new URL(raw, baseHref).href;
  } catch {
    return null;
  }
}
