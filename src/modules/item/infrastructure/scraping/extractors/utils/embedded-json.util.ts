import * as cheerio from 'cheerio';
import { EMBEDDED_JSON_SCRIPT_IDS } from '../constants/embedded-json-script-ids.constant';
import {
  DESC_KEYS,
  IMAGE_KEYS,
  PRICE_KEYS,
  TITLE_KEYS,
} from '../constants/embedded-json-keys.constant';
import type { ExtractionAccumulator } from '../interfaces/extraction-accumulator.interface';
import type { MetadataExtractor } from '../interfaces/metadata-extractor.interface';
import { parseScrapePrice } from './parse-scrape-price.util';

function pickString(obj: Record<string, unknown>, keys: readonly string[]): string | null {
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === 'string' && val.trim()) return val.trim();
  }
  return null;
}

function createAccumulator(): ExtractionAccumulator {
  return {
    title: null,
    price: null,
    description: null,
    imageUrl: null,
    color: null,
    size: null,
  };
}

export function deepWalkEmbeddedJson(
  obj: unknown,
  acc: ExtractionAccumulator,
  depth = 0
): void {
  if (depth > 8 || !obj || typeof obj !== 'object') return;

  if (Array.isArray(obj)) {
    for (const item of obj) deepWalkEmbeddedJson(item, acc, depth + 1);
    return;
  }

  const record = obj as Record<string, unknown>;

  if (!acc.title) acc.title = pickString(record, TITLE_KEYS);
  if (!acc.description) acc.description = pickString(record, DESC_KEYS);
  if (acc.price === null) {
    for (const key of PRICE_KEYS) {
      const price = parseScrapePrice(record[key]);
      if (price !== null) {
        acc.price = price;
        break;
      }
    }
  }
  if (!acc.imageUrl) {
    for (const key of IMAGE_KEYS) {
      const val = record[key];
      if (typeof val === 'string' && val.trim()) {
        acc.imageUrl = val.trim();
        break;
      }
      if (val && typeof val === 'object' && 'url' in val && typeof (val as { url: unknown }).url === 'string') {
        acc.imageUrl = (val as { url: string }).url;
        break;
      }
    }
  }
  if (!acc.color && typeof record.color === 'string') acc.color = record.color;
  if (!acc.size && typeof record.size === 'string') acc.size = record.size;

  for (const value of Object.values(record)) {
    if (value && typeof value === 'object') deepWalkEmbeddedJson(value, acc, depth + 1);
  }
}

function extractScriptJson(html: string, scriptId: string): unknown | null {
  const regex = new RegExp(`<script[^>]*id="${scriptId}"[^>]*>([\\s\\S]*?)</script>`, 'i');
  const match = html.match(regex);
  if (!match?.[1]) return null;
  try {
    return JSON.parse(match[1].trim());
  } catch {
    return null;
  }
}

function toPartial(
  acc: ExtractionAccumulator,
  mode: 'full' | 'minimal'
): ReturnType<MetadataExtractor['extract']> {
  if (mode === 'minimal') {
    return {
      title: acc.title,
      price: acc.price,
      description: acc.description,
      imageUrl: acc.imageUrl,
    };
  }
  return acc;
}

export function extractFromCapturedJson(
  capturedJson: unknown[],
  mode: 'full' | 'minimal'
): ReturnType<MetadataExtractor['extract']> {
  const acc = createAccumulator();
  for (const json of capturedJson) {
    deepWalkEmbeddedJson(json, acc);
  }
  return toPartial(acc, mode);
}

export function extractEmbeddedJsonFromHtml(
  html: string,
  mode: 'full' | 'minimal',
  capturedJson: unknown[] = []
): ReturnType<MetadataExtractor['extract']> {
  const acc = createAccumulator();

  for (const id of EMBEDDED_JSON_SCRIPT_IDS) {
    const parsed = extractScriptJson(html, id);
    if (parsed) deepWalkEmbeddedJson(parsed, acc);
  }

  for (const json of capturedJson) {
    deepWalkEmbeddedJson(json, acc);
  }

  const $ = cheerio.load(html);
  $('script:not([type])').each((_, el) => {
    const content = $(el).html()?.trim() ?? '';
    if (!content.includes('__NEXT_DATA__') && !content.includes('__NUXT__')) return;
    const jsonMatch = content.match(/=\s*(\{[\s\S]*\})\s*;?\s*$/);
    if (!jsonMatch?.[1]) return;
    try {
      deepWalkEmbeddedJson(JSON.parse(jsonMatch[1]), acc);
    } catch {
      // ignore
    }
  });

  return toPartial(acc, mode);
}
