import type { ImportedItemPreview } from './imported-item-preview';
import {
  classifyImportedCustomFields,
  cleanImportedCustomFieldsMaps,
  hasClassifiedCustomFields,
} from './classify-imported-custom-fields.util';

export const GIFTISTRY_CSV_HEADERS = [
  'Category',
  'Priority',
  'Item',
  'Star',
  'Price',
  'Website Link',
  'Description',
  'Audience',
  'Suggestion',
] as const;

const WEBSITE_HEADER_ALIASES = new Set(['Website Link', 'Website']);

export type GiftistryTabularDelimiter = ',' | '\t';

export interface GiftistryTabularHeader {
  headerIndex: number;
  delimiter: GiftistryTabularDelimiter;
  lines: string[];
}

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

function matchesGiftistryHeaderCells(cells: string[]): boolean {
  if (cells.length < GIFTISTRY_CSV_HEADERS.length) {
    return false;
  }
  return GIFTISTRY_CSV_HEADERS.every((header, index) => {
    if (index === 5) {
      return WEBSITE_HEADER_ALIASES.has(cells[index]?.trim() ?? '');
    }
    return cells[index]?.trim() === header;
  });
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
    if (!raw.trim() || isSheetPreambleLine(raw)) {
      continue;
    }

    const tabCells = parseDelimitedLine(raw, '\t').map((cell) => cell.trim());
    if (tabCells.length >= GIFTISTRY_CSV_HEADERS.length && matchesGiftistryHeaderCells(tabCells)) {
      return { headerIndex: i, delimiter: '\t', lines };
    }

    const csvCells = parseDelimitedLine(raw, ',').map((cell) => cell.trim());
    if (csvCells.length >= GIFTISTRY_CSV_HEADERS.length && matchesGiftistryHeaderCells(csvCells)) {
      return { headerIndex: i, delimiter: ',', lines };
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
