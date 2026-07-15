import type { ImportedItemPreview } from '../imported-item-preview';

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

export function isGiftistryExportCsv(text: string): boolean {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    return false;
  }
  const headerCells = parseCsvLine(lines[0]);
  if (headerCells.length < GIFTISTRY_CSV_HEADERS.length) {
    return false;
  }
  return GIFTISTRY_CSV_HEADERS.every((header, index) => headerCells[index] === header);
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
    color: item.color?.trim() || undefined,
    size: item.size?.trim() || undefined,
    desiredQuantity: normalizeDesiredQuantity(item.desiredQuantity),
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
