import * as cheerio from 'cheerio';
import type { MetadataExtractor } from './types';

const PRICE_KEYS = ['price', 'currentPrice', 'salePrice', 'listPrice', 'regularPrice', 'unitPrice'];
const TITLE_KEYS = ['productName', 'title', 'name', 'displayName'];
const DESC_KEYS = ['description', 'shortDescription', 'longDescription'];
const IMAGE_KEYS = ['imageUrl', 'primaryImage', 'image', 'thumbnail', 'heroImage'];

function parsePrice(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^0-9.]/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function pickString(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === 'string' && val.trim()) return val.trim();
  }
  return null;
}

function deepWalk(
  obj: unknown,
  acc: {
    title: string | null;
    price: number | null;
    description: string | null;
    imageUrl: string | null;
    color: string | null;
    size: string | null;
  },
  depth = 0
): void {
  if (depth > 8 || !obj || typeof obj !== 'object') return;

  if (Array.isArray(obj)) {
    for (const item of obj) deepWalk(item, acc, depth + 1);
    return;
  }

  const record = obj as Record<string, unknown>;

  if (!acc.title) acc.title = pickString(record, TITLE_KEYS);
  if (!acc.description) acc.description = pickString(record, DESC_KEYS);
  if (acc.price === null) {
    for (const key of PRICE_KEYS) {
      const price = parsePrice(record[key]);
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
    if (value && typeof value === 'object') deepWalk(value, acc, depth + 1);
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

export function extractFromCapturedJson(
  capturedJson: unknown[],
  mode: 'full' | 'minimal'
): ReturnType<MetadataExtractor['extract']> {
  const acc = {
    title: null as string | null,
    price: null as number | null,
    description: null as string | null,
    imageUrl: null as string | null,
    color: null as string | null,
    size: null as string | null,
  };

  for (const json of capturedJson) {
    deepWalk(json, acc);
  }

  if (mode === 'minimal') {
    return { title: acc.title, price: acc.price, description: acc.description, imageUrl: acc.imageUrl };
  }
  return acc;
}

export const embeddedJsonExtractor: MetadataExtractor = {
  name: 'embedded-json',
  priority: 45,
  extract({ html, mode, capturedJson = [] }) {
    const acc = {
      title: null as string | null,
      price: null as number | null,
      description: null as string | null,
      imageUrl: null as string | null,
      color: null as string | null,
      size: null as string | null,
    };

    const scriptIds = ['__NEXT_DATA__', '__NUXT__', '__PRELOADED_STATE__'];
    for (const id of scriptIds) {
      const parsed = extractScriptJson(html, id);
      if (parsed) deepWalk(parsed, acc);
    }

    for (const json of capturedJson) {
      deepWalk(json, acc);
    }

    const $ = cheerio.load(html);
    $('script:not([type])').each((_, el) => {
      const content = $(el).html()?.trim() ?? '';
      if (!content.includes('__NEXT_DATA__') && !content.includes('__NUXT__')) return;
      const jsonMatch = content.match(/=\s*(\{[\s\S]*\})\s*;?\s*$/);
      if (!jsonMatch?.[1]) return;
      try {
        deepWalk(JSON.parse(jsonMatch[1]), acc);
      } catch {
        // ignore
      }
    });

    if (mode === 'minimal') {
      return { title: acc.title, price: acc.price, description: acc.description, imageUrl: acc.imageUrl };
    }
    return acc;
  },
};
