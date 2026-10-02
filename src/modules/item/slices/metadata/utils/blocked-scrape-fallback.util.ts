import type { ExtractedMetadata } from '../../../domain/interfaces/extracted-metadata.interface';
import type { ScrapeResult } from '../../../domain/interfaces/scrape-result.interface';
import {
  isAmazonScrapeUrl,
  parseAmazonAsinFromUrl,
} from '../../../domain/utils/amazon-url.util';
import type { BlockedAiFallbackTrustContext } from '../interfaces/blocked-ai-fallback-trust-context.interface';
import type { BlockedScrapeDiagnostics } from '../interfaces/blocked-scrape-diagnostics.interface';
import { TITLE_STOP_WORDS } from '../constants/title-stop-words.constant';

export function emptyExtractedMetadata(): ExtractedMetadata {
  return {
    title: '',
    price: null,
    description: null,
    color: null,
    size: null,
    category: null,
    imageUrl: null,
  };
}

export function buildBlockedScrapeFallback(
  resolvedUrl: string,
  diagnostics: BlockedScrapeDiagnostics = {}
): ScrapeResult {
  return {
    data: emptyExtractedMetadata(),
    diagnostics: {
      source: diagnostics.tier ?? 'playwright',
      confidence: 'low',
      fieldsFound: [],
      blocked: true,
      validationReason: diagnostics.validationReason,
    },
    finalUrl: resolvedUrl,
  };
}

/** Minimal context for AI when scrape HTML is a bot/captcha gate. */
export function buildBlockedPageContext(url: string): string {
  const lines = [`URL: ${url}`];
  if (isAmazonScrapeUrl(url)) {
    lines.push('Retailer: Amazon');
    const asin = parseAmazonAsinFromUrl(url);
    if (asin) {
      lines.push(`ASIN: ${asin}`);
    }
  }
  lines.push(
    'Note: Automated page fetch was blocked (bot check / captcha). Do not invent a product name, price, specs, or image from prompt examples or from an ASIN/URL alone. Use null / omit fields when page and search context do not identify the product. If web search context names a product, extract only what that search supports.'
  );
  return lines.join('\n');
}

export function blockedFallbackSucceeded(data: ExtractedMetadata): boolean {
  return Boolean(data.title?.trim()) || data.price != null || Boolean(data.imageUrl?.trim());
}

/** True when page context has no scrape-title facts beyond the blocked-gate template. */
export function isThinBlockedPageContext(pageContext: string | null | undefined): boolean {
  const ctx = pageContext?.trim() ?? '';
  if (!ctx) {
    return true;
  }
  // formatScrapeFactsForAi prepends a JSON block with "title" when scrape had a title.
  if (/Scraped facts[\s\S]*?"title"\s*:/.test(ctx)) {
    return false;
  }
  return true;
}

export function isSubstantiveSearchContext(searchContext: string | null | undefined): boolean {
  const text = searchContext?.trim() ?? '';
  if (!text || text === 'None') {
    return false;
  }
  return text.length >= 24;
}

function normalizeForMatch(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function significantTitleTokens(title: string): string[] {
  return normalizeForMatch(title)
    .split(' ')
    .filter((token) => token.length >= 3 && !TITLE_STOP_WORDS.has(token) && !/^b0[a-z0-9]{8}$/i.test(token));
}

/** True when the AI title is corroborated by web search snippets. */
export function titleSupportedBySearch(
  title: string | null | undefined,
  searchContext: string | null | undefined
): boolean {
  const compactTitle = title?.trim() ?? '';
  if (!compactTitle || !isSubstantiveSearchContext(searchContext)) {
    return false;
  }

  const normalizedTitle = normalizeForMatch(compactTitle);
  const normalizedSearch = normalizeForMatch(searchContext ?? '');
  if (!normalizedTitle || !normalizedSearch) {
    return false;
  }

  if (normalizedSearch.includes(normalizedTitle)) {
    return true;
  }

  const tokens = significantTitleTokens(compactTitle);
  if (tokens.length === 0) {
    return false;
  }
  if (tokens.length === 1) {
    return normalizedSearch.includes(tokens[0]!);
  }

  const matched = tokens.filter((token) => normalizedSearch.includes(token)).length;
  return matched >= 2;
}

/**
 * Whether a blocked-scrape AI populate result is safe to accept.
 * Thin context (URL/ASIN only) requires corroborating web search for the title.
 */
export function blockedAiFallbackTrusted(
  data: ExtractedMetadata,
  ctx: BlockedAiFallbackTrustContext = {}
): boolean {
  if (!blockedFallbackSucceeded(data)) {
    return false;
  }

  if (!isThinBlockedPageContext(ctx.pageContext)) {
    return true;
  }

  if (!isSubstantiveSearchContext(ctx.searchContext)) {
    return false;
  }

  const title = data.title?.trim() ?? '';
  if (!title) {
    return false;
  }

  return titleSupportedBySearch(title, ctx.searchContext);
}
