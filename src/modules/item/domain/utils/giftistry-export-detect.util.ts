import type { ImportedItemPreview } from '../interfaces/imported-item-preview.interface';
import {
  classifyImportedCustomFields,
  cleanImportedCustomFieldsMaps,
  hasClassifiedCustomFields,
} from './classify-imported-custom-fields.util';
import {
  GIFTISTRY_TABULAR_COLUMN_KEYS,
  GIFTISTRY_TABULAR_HEADERS,
  WEBSITE_HEADER_ALIASES,
} from '../constants/giftistry-csv-headers.constant';
import type { GiftistryTabularColumnKey } from '../types/giftistry-tabular-column-key.type';
import type { GiftistryTabularDelimiter } from '../types/giftistry-tabular-delimiter.type';
import type { GiftistryTabularHeader } from '../interfaces/giftistry-tabular-header.interface';

export function isGiftistryExportJson(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.items)) {
    return false;
  }
  return record.items.every((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return false;
    }
    return typeof (item as { name?: unknown }).name === 'string';
  });
}

export function isSheetPreambleLine(line: string): boolean {
  return /^#\s*Sheet:/i.test(line.trim());
}

export function splitExportLines(text: string): string[] {
  return text.replace(/^\uFEFF/, '').split(/\r?\n/);
}

const TABULAR_HEADER_LABEL_TO_KEY = (() => {
  const map = new Map<string, GiftistryTabularColumnKey>();
  for (let index = 0; index < GIFTISTRY_TABULAR_HEADERS.length; index++) {
    const label = GIFTISTRY_TABULAR_HEADERS[index];
    const key = GIFTISTRY_TABULAR_COLUMN_KEYS[index];
    if (label && key) {
      map.set(label, key);
    }
  }
  for (const alias of WEBSITE_HEADER_ALIASES) {
    map.set(alias, 'website');
  }
  return map;
})();

function tabularColumnKeyForHeaderLabel(label: string): GiftistryTabularColumnKey | null {
  return TABULAR_HEADER_LABEL_TO_KEY.get(label.trim()) ?? null;
}

function matchTabularHeader(
  cells: string[]
): { columnCount: number; columnIndexByKey: Partial<Record<GiftistryTabularColumnKey, number>> } | null {
  const columnIndexByKey: Partial<Record<GiftistryTabularColumnKey, number>> = {};
  let hasItem = false;

  for (let index = 0; index < cells.length; index++) {
    const key = tabularColumnKeyForHeaderLabel(cells[index] ?? '');
    if (!key) {
      continue;
    }

    if (columnIndexByKey[key] === undefined) {
      columnIndexByKey[key] = index;
    }

    if (key === 'item') {
      hasItem = true;
    }
  }

  if (!hasItem) {
    return null;
  }

  return {
    columnCount: cells.length,
    columnIndexByKey,
  };
}

export function parseDelimitedLine(line: string, delimiter: GiftistryTabularDelimiter): string[] {
  if (delimiter === '\t') {
    return line.split('\t');
  }
  return parseCsvLine(line);
}

export function findGiftistryTabularHeader(text: string): GiftistryTabularHeader | null {
  const lines = splitExportLines(text);
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (raw == null || !raw.trim() || isSheetPreambleLine(raw)) {
      continue;
    }

    const tabCells = parseDelimitedLine(raw, '\t').map((cell) => cell.trim());
    const tabMatch = matchTabularHeader(tabCells);
    if (tabMatch) {
      return { headerIndex: i, delimiter: '\t', lines, ...tabMatch };
    }

    const csvCells = parseDelimitedLine(raw, ',').map((cell) => cell.trim());
    const csvMatch = matchTabularHeader(csvCells);
    if (csvMatch) {
      return { headerIndex: i, delimiter: ',', lines, ...csvMatch };
    }
  }
  return null;
}

export function isGiftistryExportCsv(text: string): boolean {
  return findGiftistryTabularHeader(text) !== null;
}

export function isGiftistryExportTxt(text: string): boolean {
  const lines = splitExportLines(text);
  const hasRegistry = lines.some((line) => /^WISHLIST REGISTRY:\s+\S+/i.test(line.trim()));
  if (!hasRegistry) {
    return false;
  }
  const hasBanner = lines.some((line) => /^=+$/.test(line.trim()));
  const hasCategory = lines.some((line) => /^\[[^\]]+\]\s*$/.test(line.trim()));
  return hasBanner || hasCategory;
}

/**
 * Giftistry Markdown dialect: at least one `# Item` heading and one `- Key: Value` meta line,
 * or `# Wishlist: …` plus an item heading.
 */
export function isGiftistryExportMarkdown(text: string): boolean {
  const lines = splitExportLines(text);
  let hasItemHeading = false;
  let hasMetaLine = false;
  let hasWishlistTitle = false;

  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    if (/^#\s+Wishlist:\s*\S+/i.test(trimmed)) {
      hasWishlistTitle = true;
      continue;
    }
    if (/^#\s+\S+/.test(trimmed) && !trimmed.startsWith('##')) {
      hasItemHeading = true;
      continue;
    }
    if (/^-\s+[^:]+:\s*.+/.test(trimmed)) {
      hasMetaLine = true;
    }
  }

  return (hasItemHeading && hasMetaLine) || (hasWishlistTitle && hasItemHeading);
}

export function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === ',') {
      cells.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  cells.push(current);
  return cells;
}

export function parsePriceValue(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') {
    return null;
  }
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw;
  }
  const cleaned = String(raw).replace(/[^0-9.-]/g, '');
  if (!cleaned) {
    return null;
  }
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeImportedItem(item: Partial<ImportedItemPreview> & { name?: string }): ImportedItemPreview | null {
  const name = item.name?.trim();
  if (!name) {
    return null;
  }

  const color = item.color?.trim() || undefined;
  const size = item.size?.trim() || undefined;
  const existing = cleanImportedCustomFieldsMaps(item.customFields);

  const classified = classifyImportedCustomFields(
    existing
      ? [
          ...Object.entries(existing.Predefined).map(([key, value]) => ({ key, value })),
          ...Object.entries(existing.UserDefined).map(([key, value]) => ({ key, value })),
        ]
      : [],
    {
      title: name,
      category: item.category,
      url: item.websiteLink,
    },
    { color, size }
  );

  const customFields = hasClassifiedCustomFields(classified)
    ? {
        Predefined: classified.Predefined,
        UserDefined: classified.UserDefined,
      }
    : undefined;

  return {
    name,
    category: item.category?.trim() || undefined,
    priority:
      item.priority !== undefined && item.priority !== null && Number.isFinite(Number(item.priority))
        ? Number(item.priority)
        : undefined,
    description: item.description?.trim() || undefined,
    price: item.price === undefined ? undefined : parsePriceValue(item.price),
    websiteLink: item.websiteLink?.trim() || undefined,
    isFavorite: item.isFavorite === true,
    color: classified.color || color,
    size: classified.size || size,
    desiredQuantity: normalizeDesiredQuantity(item.desiredQuantity),
    customFields,
  };
}

function normalizeDesiredQuantity(raw: unknown): number | undefined {
  if (raw === undefined || raw === null) return undefined;
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n)) return undefined;
  const qty = Math.floor(n);
  if (qty < 2 || qty > 99) return undefined;
  return qty;
}
