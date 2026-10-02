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
import { safeFetch } from '../scraping/utils/safe-fetch.util';
import { scrapingConfig } from '../scraping/utils/scraping-config.util';

export async function fetchPageHtml(url: string): Promise<string> {
  try {
    const result = await safeFetch(url, {
      headers: { ...HTTP_PAGE_FETCH_HEADERS },
      timeoutMs: HTTP_PAGE_FETCH_TIMEOUT_MS,
      maxBytes: scrapingConfig.maxHtmlBytes,
    });
    if (result.status < 200 || result.status >= 300) {
      return '';
    }
    return result.body;
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
