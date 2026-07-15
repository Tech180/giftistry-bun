import type { PageContextFetcher } from '../domain/ports/page-context.port';
import { buildJsonLdPageContext, extractJsonLdProductDetails } from './scraping/extractors/json-ld-product.util';
import {
  extractOgSiteName,
  resolveWebsiteName,
  type WebsiteNameHints,
} from './scraping/extractors/resolve-website-name.util';
import { extractShopifyProductContext } from './scraping/extractors/shopify-product-context.util';

export async function fetchPageHtml(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return '';
    return await res.text();
  } catch {
    return '';
  }
}

export async function fetchPageContext(url: string): Promise<string> {
  const html = await fetchPageHtml(url);
  if (!html) return '';
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

export class HttpPageContextFetcher implements PageContextFetcher {
  fetchHtml(url: string): Promise<string> {
    return fetchPageHtml(url);
  }

  fetchContext(url: string): Promise<string> {
    return fetchPageContext(url);
  }

  resolveWebsiteName(url: string, html = ''): string {
    return resolveWebsiteNameForUrl(url, html);
  }

  buildContextFromHtml(html: string, url: string): string {
    return buildJsonLdPageContext(html, url);
  }
}
