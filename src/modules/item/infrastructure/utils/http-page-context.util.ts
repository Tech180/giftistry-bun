import { buildJsonLdPageContext, extractJsonLdProductDetails } from '../scraping/extractors/utils/json-ld-product.util';
import type { WebsiteNameHints } from '../scraping/extractors/interfaces/website-name-hints.interface';
import {
  extractOgSiteName,
  resolveWebsiteName,
} from '../scraping/extractors/utils/resolve-website-name.util';
import { extractShopifyProductContext } from '../scraping/extractors/utils/shopify-product-context.util';
import {
  HTTP_PAGE_FETCH_HEADERS,
  HTTP_PAGE_FETCH_TIMEOUT_MS,
} from '../constants/http-page-fetch.constant';

export async function fetchPageHtml(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { ...HTTP_PAGE_FETCH_HEADERS },
      signal: AbortSignal.timeout(HTTP_PAGE_FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      return '';
    }
    return await res.text();
  } catch {
    return '';
  }
}

export async function fetchPageContext(url: string): Promise<string> {
  const html = await fetchPageHtml(url);
  if (!html) {
    return '';
  }
  return buildJsonLdPageContext(html, url);
}

export function buildWebsiteNameHints(html: string, url: string): WebsiteNameHints {
  const details = html ? extractJsonLdProductDetails(html, url) : null;
  const shopify = html ? extractShopifyProductContext(html, url) : null;

  return {
    ogSiteName: html ? extractOgSiteName(html) : null,
    brand: details?.brand ?? null,
    vendor: shopify?.vendor ?? null,
  };
}

export function resolveWebsiteNameForUrl(url: string, html = ''): string {
  return resolveWebsiteName(url, buildWebsiteNameHints(html, url));
}
