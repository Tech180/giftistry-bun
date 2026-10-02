import type { ServerConfigRepository } from '@/modules/system';
import {
  clampAiWebSearchMaxPages,
  DEFAULT_AI_WEB_SEARCH_MAX_PAGES,
} from '@/modules/system';
import type { ProductResearcher } from '../../domain/ports/product-researcher.port';
import type { ProductResearchInput } from '../../domain/interfaces/product-research-input.interface';
import { safeFetch } from '../scraping/utils/safe-fetch.util';
import {
  buildSearchQuery,
  extractMainTextFromHtml,
  formatSearchContext,
  isSamePage,
  normalizePageUrl,
} from '../utils/product-research.util';
import type { SearchResultItem } from '../interfaces/search-result-item.interface';
import { wrapUntrustedSearchContext } from '../constants/populate-prompt-rules.constant';

interface SearxngResult {
  title?: string;
  url?: string;
  content?: string;
}

interface SearxngSearchResponse {
  results?: SearxngResult[];
}

export class SearxngProductResearcher implements ProductResearcher {
  constructor(private readonly configRepo: ServerConfigRepository) {}

  canHandle(config = this.configRepo.load()): boolean {
    return Boolean(config.AiWebSearchEndpoint?.trim());
  }

  async research(input: ProductResearchInput): Promise<string> {
    const config = this.configRepo.load();
    const endpoint = config.AiWebSearchEndpoint?.trim();
    if (!endpoint) {
      return 'None';
    }

    const query = buildSearchQuery(input);
    if (!query.trim()) {
      return 'None';
    }

    const maxPages = clampAiWebSearchMaxPages(
      config.AiWebSearchMaxPages ?? DEFAULT_AI_WEB_SEARCH_MAX_PAGES
    );

    const searchUrl = new URL('/search', endpoint.endsWith('/') ? endpoint : `${endpoint}/`);
    searchUrl.searchParams.set('q', query);
    searchUrl.searchParams.set('format', 'json');

    const { body } = await safeFetch(searchUrl.toString(), {
      maxBytes: 512 * 1024,
    });

    let payload: SearxngSearchResponse;
    try {
      payload = JSON.parse(body) as SearxngSearchResponse;
    } catch {
      return 'None';
    }

    const results: SearchResultItem[] = (payload.results ?? [])
      .map((entry) => ({
        title: entry.title?.trim() || entry.url?.trim() || '',
        url: entry.url?.trim() || '',
        snippet: entry.content?.trim() || '',
      }))
      .filter((entry) => entry.url && normalizePageUrl(entry.url))
      .slice(0, maxPages + 2);

    const fetchedPages: Array<{ url: string; content: string }> = [];
    const fetchTargets = results.filter((result) => !isSamePage(result.url, input.url));

    await Promise.all(
      fetchTargets.slice(0, maxPages).map(async (result) => {
        try {
          const { body: pageHtml } = await safeFetch(result.url, {
            maxBytes: 512 * 1024,
          });
          const text = extractMainTextFromHtml(pageHtml);
          if (!text) return;
          fetchedPages.push({
            url: result.url,
            content: text.slice(0, 4000),
          });
        } catch {
          /* skip failed pages */
        }
      })
    );

    const context = formatSearchContext(query, results, fetchedPages);
    return context === 'None' ? context : wrapUntrustedSearchContext(context);
  }
}
