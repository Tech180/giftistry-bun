import type { AiMetadataExtractionOptions } from '@/modules/system';
import type { BuildAiEvidenceInput } from '../interfaces/build-ai-evidence-input.interface';
import type { ProductCandidate } from '../interfaces/product-candidate.interface';
import { formatScrapeFactsForAi } from './format-scrape-facts-for-ai.util';
import { trimPageContextForAi } from './trim-page-context-for-ai.util';

const SECTION = {
  structured: '=== STRUCTURED CANDIDATES ===',
  prices: '=== VISIBLE PRICE SNIPPETS ===',
  main: '=== MAIN CONTENT (trimmed) ===',
  images: '=== IMAGE CANDIDATES ===',
  breadcrumbs: '=== BREADCRUMBS ===',
  scrapeFacts: '=== SCRAPED FACTS ===',
} as const;

const MAIN_TEXT_MAX_CHARS = 6_000;
const PRICE_SNIPPET_MAX = 12;

function parseJsonLdBlocks(html: string): unknown[] {
  const blocks: unknown[] = [];
  const pattern = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) {
    const content = match[1]?.trim();
    if (!content) continue;
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) blocks.push(...parsed);
      else blocks.push(parsed);
    } catch {
      /* ignore */
    }
  }
  return blocks;
}

function typeTokens(record: Record<string, unknown>): string[] {
  const raw = record['@type'];
  if (typeof raw === 'string') return [raw];
  if (Array.isArray(raw)) {
    return raw.filter((t): t is string => typeof t === 'string');
  }
  return [];
}

function isProductType(types: string[]): boolean {
  return types.some((t) => /product/i.test(t));
}

function readBrand(record: Record<string, unknown>): string | undefined {
  const brand = record.brand;
  if (typeof brand === 'string' && brand.trim()) return brand.trim();
  if (brand && typeof brand === 'object' && !Array.isArray(brand)) {
    const name = (brand as Record<string, unknown>).name;
    if (typeof name === 'string' && name.trim()) return name.trim();
  }
  return undefined;
}

function collectProductNodes(node: unknown, out: Record<string, unknown>[], sourceKey: string): void {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const item of node) {
      collectProductNodes(item, out, sourceKey);
    }
    return;
  }
  const record = node as Record<string, unknown>;
  const types = typeTokens(record);
  if (isProductType(types)) {
    out.push({ ...record, sourceKey });
  }
  if (Array.isArray(record['@graph'])) {
    collectProductNodes(record['@graph'], out, sourceKey);
  }
}

function toProductCandidate(record: Record<string, unknown>, sourceKey: string): ProductCandidate {
  const imageRaw = record.image;
  const imageUrls: string[] = [];
  const pushImage = (val: unknown) => {
    if (typeof val === 'string' && val.trim()) imageUrls.push(val.trim());
    else if (val && typeof val === 'object' && !Array.isArray(val)) {
      const url = (val as Record<string, unknown>).url;
      if (typeof url === 'string' && url.trim()) imageUrls.push(url.trim());
    }
  };
  if (typeof imageRaw === 'string') pushImage(imageRaw);
  else if (Array.isArray(imageRaw)) imageRaw.forEach(pushImage);
  else pushImage(imageRaw);

  return {
    name: typeof record.name === 'string' ? record.name.trim() : undefined,
    description:
      typeof record.description === 'string' ? record.description.trim().slice(0, 400) : undefined,
    brand: readBrand(record),
    gtin: typeof record.gtin === 'string' ? record.gtin.trim() : undefined,
    sku: typeof record.sku === 'string' ? record.sku.trim() : undefined,
    imageUrls: imageUrls.length ? [...new Set(imageUrls)].slice(0, 8) : undefined,
    types: typeTokens(record),
    sourceKey,
  };
}

function extractStructuredCandidates(html: string): ProductCandidate[] {
  const blocks = parseJsonLdBlocks(html);
  const nodes: Record<string, unknown>[] = [];
  blocks.forEach((block, index) => {
    collectProductNodes(block, nodes, `json-ld-${index + 1}`);
  });
  return nodes.map((node) =>
    toProductCandidate(node, typeof node.sourceKey === 'string' ? node.sourceKey : 'json-ld')
  );
}

function stripVisibleHtml(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ');
}

function extractVisiblePriceSnippets(html: string): string[] {
  const visible = stripVisibleHtml(html).replace(/\s+/g, ' ');
  const pattern =
    /(?:USD|EUR|GBP|CAD|\$|€|£)\s?\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?|\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?\s?(?:USD|EUR|GBP|CAD)/gi;
  const seen = new Set<string>();
  const snippets: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(visible)) !== null && snippets.length < PRICE_SNIPPET_MAX) {
    const snippet = match[0].trim();
    const key = snippet.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    snippets.push(snippet);
  }
  return snippets;
}

function extractMainContentText(html: string): string {
  const visible = stripVisibleHtml(html).replace(/\s+/g, ' ').trim();
  if (visible.length <= MAIN_TEXT_MAX_CHARS) {
    return visible;
  }
  return `${visible.slice(0, MAIN_TEXT_MAX_CHARS)}…`;
}

function extractImageCandidates(html: string): string[] {
  const urls = new Set<string>();
  const og =
    html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)?.[1] ||
    html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i)?.[1];
  if (og?.trim()) urls.add(og.trim());

  for (const match of html.matchAll(
    /<img[^>]+src=["']([^"']+)["'][^>]*>/gi
  )) {
    const src = match[1]?.trim();
    if (!src || src.startsWith('data:')) continue;
    if (/logo|icon|sprite|pixel|1x1|spacer/i.test(src)) continue;
    urls.add(src);
    if (urls.size >= 12) break;
  }

  for (const candidate of extractStructuredCandidates(html)) {
    for (const image of candidate.imageUrls ?? []) {
      urls.add(image);
      if (urls.size >= 12) break;
    }
  }

  return [...urls].slice(0, 12);
}

function extractBreadcrumbLabels(html: string): string[] {
  const blocks = parseJsonLdBlocks(html);
  const crumbs: string[] = [];

  const walk = (node: unknown): void => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    const record = node as Record<string, unknown>;
    const types = typeTokens(record);
    if (types.some((t) => /breadcrumb/i.test(t))) {
      const items = record.itemListElement;
      if (Array.isArray(items)) {
        for (const entry of items) {
          if (!entry || typeof entry !== 'object') continue;
          const item = (entry as Record<string, unknown>).item;
          if (typeof item === 'string' && item.trim()) {
            crumbs.push(item.trim());
          } else if (item && typeof item === 'object') {
            const name = (item as Record<string, unknown>).name;
            if (typeof name === 'string' && name.trim()) crumbs.push(name.trim());
          }
          const name = (entry as Record<string, unknown>).name;
          if (typeof name === 'string' && name.trim()) crumbs.push(name.trim());
        }
      }
    }
    if (Array.isArray(record['@graph'])) walk(record['@graph']);
  };

  blocks.forEach(walk);

  if (crumbs.length === 0) {
    const nav = html.match(/<nav[^>]*aria-label=["']breadcrumb["'][^>]*>([\s\S]*?)<\/nav>/i)?.[1];
    if (nav) {
      for (const match of nav.matchAll(/>([^<]{2,80})</g)) {
        const label = match[1]?.replace(/\s+/g, ' ').trim();
        if (label) crumbs.push(label);
      }
    }
  }

  return [...new Set(crumbs)].slice(0, 20);
}

function appendSection(lines: string[], header: string, body: string | undefined): void {
  const trimmed = body?.trim();
  if (!trimmed) return;
  lines.push(header, trimmed, '');
}

/** Builds delimited AI evidence sections from HTML and optional scrape metadata. */
export function buildAiEvidence(input: BuildAiEvidenceInput): string {
  const { html, scrape, extraction } = input;
  const lines: string[] = [];

  const candidates = extractStructuredCandidates(html);
  if (candidates.length > 0) {
    appendSection(lines, SECTION.structured, JSON.stringify(candidates, null, 0));
  }

  const prices = extractVisiblePriceSnippets(html);
  if (prices.length > 0) {
    appendSection(lines, SECTION.prices, prices.join('\n'));
  }

  appendSection(lines, SECTION.main, extractMainContentText(html));

  const images = extractImageCandidates(html);
  if (images.length > 0) {
    appendSection(lines, SECTION.images, images.join('\n'));
  }

  const breadcrumbs = extractBreadcrumbLabels(html);
  if (breadcrumbs.length > 0) {
    appendSection(lines, SECTION.breadcrumbs, breadcrumbs.join(' > '));
  }

  if (scrape) {
    const facts = formatScrapeFactsForAi(scrape);
    if (facts) {
      appendSection(lines, SECTION.scrapeFacts, facts.replace(/^Scraped facts[^\n]*\n?/, '').trim());
    }
  }

  const combined = lines.join('\n').trim();
  return trimPageContextForAi(combined, extraction);
}

export function buildAiEvidenceFromHtml(
  html: string,
  url: string,
  extraction: Pick<AiMetadataExtractionOptions, 'pageContextMaxChars'> = {
    pageContextMaxChars: 0,
  }
): string {
  void url;
  return buildAiEvidence({ html, url, extraction });
}
