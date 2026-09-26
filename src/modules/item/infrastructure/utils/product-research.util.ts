import * as cheerio from 'cheerio';
import type { ProductResearchInput } from '../../domain/interfaces/product-research-input.interface';
import { MAX_SEARCH_RESULTS } from '../constants/product-research.constant';
import type { SearchResultItem } from '../interfaces/search-result-item.interface';

export function buildSearchQuery(input: ProductResearchInput): string {
  const parts = [input.itemName.trim()];
  if (input.websiteName?.trim()) {
    parts.push(input.websiteName.trim());
  }
  parts.push('specifications');
  return parts.filter(Boolean).join(' ');
}

function normalizeResultUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const decoded = decodeURIComponent(trimmed);
    const match = decoded.match(/uddg=([^&]+)/);
    if (match?.[1]) {
      return decodeURIComponent(match[1]);
    }
  } catch {
    // ignore
  }

  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }

  if (trimmed.startsWith('/')) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return null;
}

export function parseSearchResults(html: string): SearchResultItem[] {
  const $ = cheerio.load(html);
  const results: SearchResultItem[] = [];
  const seen = new Set<string>();

  const addResult = (title: string, url: string, snippet: string) => {
    const normalizedUrl = normalizeResultUrl(url);
    if (!normalizedUrl || seen.has(normalizedUrl)) {
      return;
    }
    const cleanTitle = title.replace(/\s+/g, ' ').trim();
    const cleanSnippet = snippet.replace(/\s+/g, ' ').trim();
    if (!cleanTitle || !cleanSnippet) {
      return;
    }
    seen.add(normalizedUrl);
    results.push({ title: cleanTitle, url: normalizedUrl, snippet: cleanSnippet });
  };

  $('.result').each((_, el) => {
    if (results.length >= MAX_SEARCH_RESULTS) {
      return false;
    }
    const title = $(el).find('.result__title a, .result__a').first().text();
    const href =
      $(el).find('.result__title a, .result__a').first().attr('href') ??
      $(el).find('a.result__snippet').attr('href') ??
      '';
    const snippet =
      $(el).find('.result__snippet').text() ||
      $(el).find('.result__body').text() ||
      '';
    addResult(title, href, snippet);
  });

  if (results.length === 0) {
    $('a.result__a').each((_, el) => {
      if (results.length >= MAX_SEARCH_RESULTS) {
        return false;
      }
      const title = $(el).text();
      const href = $(el).attr('href') ?? '';
      const snippet = $(el).closest('.result, .web-result').find('.result__snippet').text();
      addResult(title, href, snippet);
    });
  }

  return results.slice(0, MAX_SEARCH_RESULTS);
}

export function extractMainTextFromHtml(html: string): string {
  const $ = cheerio.load(html);
  $('script, style, nav, header, footer, aside, noscript').remove();

  const main =
    $('main').text() ||
    $('article').text() ||
    $('[role="main"]').text() ||
    $('body').text();

  return main.replace(/\s+/g, ' ').trim();
}

export function formatSearchContext(
  query: string,
  results: SearchResultItem[],
  fetchedPages: Array<{ url: string; content: string }>
): string {
  if (results.length === 0 && fetchedPages.length === 0) {
    return 'None';
  }

  const lines = [`Search query: ${query}`, '', 'Search results:'];

  for (const [index, result] of results.entries()) {
    lines.push(`${index + 1}. ${result.title}`);
    lines.push(`   URL: ${result.url}`);
    lines.push(`   Snippet: ${result.snippet}`);
    lines.push('');
  }

  if (fetchedPages.length > 0) {
    lines.push('Fetched page content:');
    for (const page of fetchedPages) {
      lines.push(`URL: ${page.url}`);
      lines.push(page.content);
      lines.push('');
    }
  }

  return lines.join('\n').trim();
}

export function normalizePageUrl(url: string): string | null {
  try {
    return new URL(url).href;
  } catch {
    return null;
  }
}

export function isSamePage(url: string, sourceUrl?: string): boolean {
  if (!sourceUrl) {
    return false;
  }
  try {
    const a = new URL(url);
    const b = new URL(sourceUrl);
    return a.hostname === b.hostname && a.pathname === b.pathname;
  } catch {
    return false;
  }
}
