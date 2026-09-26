import type { ProductResearchInput } from '../../domain/interfaces/product-research-input.interface';
import {
  DUCKDUCKGO_HTML_SEARCH_URL,
  MAX_FETCHED_PAGES,
  MAX_PAGE_CONTENT_CHARS,
} from '../constants/product-research.constant';
import type { SearchResultItem } from '../interfaces/search-result-item.interface';
import { playwrightManager } from '../scraping/playwright-manager';
import { playwrightFetchPage } from '../scraping/utils/playwright-fetch-page.util';
import { scrapingConfig } from '../scraping/utils/scraping-config.util';
import {
  buildSearchQuery,
  extractMainTextFromHtml,
  formatSearchContext,
  isSamePage,
  normalizePageUrl,
  parseSearchResults,
} from './product-research.util';

export async function searchDuckDuckGo(query: string): Promise<string> {
  const searchUrl = `${DUCKDUCKGO_HTML_SEARCH_URL}${encodeURIComponent(query)}`;
  const context = await playwrightManager.acquire();

  try {
    const page = await context.newPage();
    await page.goto(searchUrl, {
      waitUntil: 'domcontentloaded',
      timeout: scrapingConfig.playwrightTimeoutMs,
    });
    await page.waitForSelector('.result, .result__a', { timeout: 5000 }).catch(() => {});
    return await page.content();
  } finally {
    await playwrightManager.release(context);
  }
}

export async function fetchResultPages(
  results: SearchResultItem[],
  sourceUrl?: string
): Promise<Array<{ url: string; content: string }>> {
  const fetched: Array<{ url: string; content: string }> = [];

  for (const result of results) {
    if (fetched.length >= MAX_FETCHED_PAGES) {
      break;
    }
    if (isSamePage(result.url, sourceUrl)) {
      continue;
    }

    try {
      const { html } = await playwrightFetchPage(result.url);
      const text = extractMainTextFromHtml(html);
      if (!text) {
        continue;
      }
      fetched.push({
        url: result.url,
        content: text.slice(0, MAX_PAGE_CONTENT_CHARS),
      });
    } catch {
      // Skip pages that fail to load.
    }
  }

  return fetched;
}

export async function researchProductOnWeb(input: ProductResearchInput): Promise<string> {
  const query = buildSearchQuery(input);
  if (!query.trim()) {
    return 'None';
  }

  const html = await searchDuckDuckGo(query);
  const results = parseSearchResults(html).filter((result) => {
    const normalized = normalizePageUrl(result.url);
    return normalized !== null;
  });

  const fetchedPages = await fetchResultPages(results, input.url);
  return formatSearchContext(query, results, fetchedPages);
}
