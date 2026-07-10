import * as cheerio from 'cheerio';
import { CATEGORY_KEYWORDS } from '../../domain/category-keywords';
import type { ExtractedMetadata, ScrapeMode } from '../../domain/extracted-metadata';
import { decodeHtmlEntities } from './html-utils';

function getMetaContent($: cheerio.CheerioAPI, selectors: string[]): string {
  for (const selector of selectors) {
    const el = $(selector).first();
    const content = el.attr('content')?.trim();
    if (content) return decodeHtmlEntities(content);
  }
  return '';
}

function extractTitleFromSlug(url: string): string {
  try {
    const urlObj = new URL(url);
    const segments = urlObj.pathname.split('/').filter(Boolean);
    const slug = segments.find((s) => s.includes('-') || s.includes('_')) || segments[0];
    if (!slug || slug.length <= 2) return '';

    const cleanSlug = slug
      .replace(/[-_]+/g, ' ')
      .replace(/\.[a-z0-9]+$/i, '')
      .trim();

    return cleanSlug
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  } catch {
    return '';
  }
}

function isGenericTitle(title: string): boolean {
  const lowerTitle = title.toLowerCase();
  return (
    !title ||
    lowerTitle === 'amazon' ||
    lowerTitle === 'amazon.com' ||
    lowerTitle === 'robot check' ||
    lowerTitle.includes('captcha') ||
    lowerTitle === 'walmart' ||
    lowerTitle === 'target'
  );
}

function extractJsonLdDetails($: cheerio.CheerioAPI): { color: string | null; size: string | null } {
  let jsonLdColor: string | null = null;
  let jsonLdSize: string | null = null;

  const extractDetails = (obj: unknown): void => {
    if (!obj || typeof obj !== 'object') return;
    const record = obj as Record<string, unknown>;

    if (record.color && typeof record.color === 'string') jsonLdColor = record.color;
    if (record.size && typeof record.size === 'string') jsonLdSize = record.size;
    if (record.color && typeof record.color === 'object' && record.color !== null && 'name' in record.color) {
      jsonLdColor = String((record.color as { name: unknown }).name);
    }
    if (record.size && typeof record.size === 'object' && record.size !== null && 'name' in record.size) {
      jsonLdSize = String((record.size as { name: unknown }).name);
    }

    if (Array.isArray(record.offers)) {
      for (const offer of record.offers) {
        extractDetails(offer);
      }
    } else if (record.offers && typeof record.offers === 'object') {
      extractDetails(record.offers);
    }
  };

  $('script[type="application/ld+json"]').each((_, el) => {
    const content = $(el).html()?.trim();
    if (!content) return;
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        parsed.forEach(extractDetails);
      } else {
        extractDetails(parsed);
      }
    } catch {
      // ignore malformed JSON-LD blocks
    }
  });

  return { color: jsonLdColor, size: jsonLdSize };
}

function detectCategory(url: string, title: string): string | null {
  try {
    const urlObj = new URL(url);
    const host = urlObj.hostname.toLowerCase();
    const path = urlObj.pathname.toLowerCase();
    const textToScan = `${host} ${path} ${title.toLowerCase()}`;

    for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      const escapedKeywords = keywords.map((kw) => kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
      const regex = new RegExp(`\\b(${escapedKeywords})\\b`, 'i');
      if (regex.test(textToScan)) {
        return cat;
      }
    }
  } catch {
    // ignore invalid URLs
  }
  return null;
}

export function parseMetadata(html: string, url: string, mode: ScrapeMode = 'full'): ExtractedMetadata {
  const $ = cheerio.load(html);

  let title =
    getMetaContent($, ['meta[property="og:title"]', 'meta[name="twitter:title"]']) ||
    $('title').first().text().trim();

  title = decodeHtmlEntities(title);

  if (isGenericTitle(title)) {
    const slugTitle = extractTitleFromSlug(url);
    if (slugTitle) title = slugTitle;
  }

  const priceStr =
    getMetaContent($, [
      'meta[property="product:price:amount"]',
      'meta[property="og:price:amount"]',
      '[itemprop="price"]',
    ]) || $('[itemprop="price"]').first().text().trim();

  const priceVal = priceStr ? Number(priceStr.replace(/[^0-9.]/g, '')) : null;
  const price = priceVal !== null && !isNaN(priceVal) ? priceVal : null;

  const description =
    getMetaContent($, [
      'meta[property="og:description"]',
      'meta[name="description"]',
      'meta[name="twitter:description"]',
    ]) || null;

  const imageUrl =
    getMetaContent($, ['meta[property="og:image"]']) || null;

  let color: string | null = null;
  let size: string | null = null;
  let category: string | null = null;

  if (mode === 'full') {
    const jsonLd = extractJsonLdDetails($);
    const colorMeta = getMetaContent($, [
      'meta[property="product:color"]',
      'meta[name="color"]',
      '[itemprop="color"]',
    ]);
    const sizeMeta = getMetaContent($, [
      'meta[property="product:size"]',
      'meta[name="size"]',
      '[itemprop="size"]',
    ]);

    color = jsonLd.color || colorMeta || null;
    size = jsonLd.size || sizeMeta || null;
    category = detectCategory(url, title);
  }

  return {
    title,
    price,
    description: description || null,
    color,
    size,
    category,
    imageUrl: imageUrl || null,
  };
}

export { isGenericTitle, extractTitleFromSlug };
