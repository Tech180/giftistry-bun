import type { ImportedItemPreview } from '../imported-item-preview';
import { isGiftistryExportJson, normalizeImportedItem, parsePriceValue } from './giftistry-export-detect';

export interface ParseGiftistryJsonResult {
  items: ImportedItemPreview[];
  warnings: string[];
  suggestedWishlistTitle?: string;
}

export function tryParseGiftistryExportJson(text: string): ParseGiftistryJsonResult | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }

  if (!isGiftistryExportJson(parsed)) {
    return null;
  }

  const record = parsed as {
    wishlistTitle?: unknown;
    exportedAt?: unknown;
    items: Array<Record<string, unknown>>;
  };

  const warnings: string[] = [];
  if (typeof record.wishlistTitle !== 'string' || !record.wishlistTitle.trim()) {
    warnings.push('Missing wishlistTitle on Giftistry JSON export.');
  }
  if (!record.exportedAt) {
    warnings.push('Missing exportedAt on Giftistry JSON export.');
  }

  const items: ImportedItemPreview[] = [];
  for (const raw of record.items) {
    const links = Array.isArray(raw.links) ? raw.links : [];
    const firstLink =
      links.find((link) => link && typeof link === 'object') as
        | { url?: unknown; price?: unknown }
        | undefined;

    if (links.length > 1) {
      warnings.push(`Item "${String(raw.name)}" has multiple links; keeping the first only.`);
    }

    const description =
      typeof raw.description === 'string'
        ? raw.description
        : raw.description && typeof raw.description === 'object'
          ? JSON.stringify(raw.description)
          : undefined;

    const normalized = normalizeImportedItem({
      name: typeof raw.name === 'string' ? raw.name : undefined,
      category: typeof raw.category === 'string' ? raw.category : undefined,
      priority:
        raw.priority !== undefined && raw.priority !== null ? Number(raw.priority) : undefined,
      description,
      price: firstLink ? parsePriceValue(firstLink.price) : parsePriceValue(raw.price),
      websiteLink: typeof firstLink?.url === 'string' ? firstLink.url : undefined,
      isFavorite: raw.isFavorite === true,
    });

    if (normalized) {
      items.push(normalized);
    }
  }

  if (items.length === 0) {
    warnings.push('Giftistry JSON export contained no importable items.');
  }

  return {
    items,
    warnings,
    suggestedWishlistTitle:
      typeof record.wishlistTitle === 'string' && record.wishlistTitle.trim()
        ? record.wishlistTitle.trim()
        : undefined,
  };
}
