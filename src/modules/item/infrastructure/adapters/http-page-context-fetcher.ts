import type { PageContextFetcher } from '../../domain/ports/page-context.port';
import { buildJsonLdPageContext } from '../scraping/extractors/utils/json-ld-product.util';
import {
  fetchPageContext,
  fetchPageHtml,
  resolveWebsiteNameForUrl,
} from '../utils/http-page-context.util';

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
