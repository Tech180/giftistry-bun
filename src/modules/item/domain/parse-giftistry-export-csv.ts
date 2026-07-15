import type { ImportedItemPreview } from '../imported-item-preview';
import {
  isGiftistryExportCsv,
  normalizeImportedItem,
  parseCsvLine,
  parsePriceValue,
} from './giftistry-export-detect';

export interface ParseGiftistryCsvResult {
  items: ImportedItemPreview[];
  warnings: string[];
}

export function tryParseGiftistryExportCsv(text: string): ParseGiftistryCsvResult | null {
  if (!isGiftistryExportCsv(text)) {
    return null;
  }

  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.length > 0);
  const warnings: string[] = [];
  const items: ImportedItemPreview[] = [];
  let currentCategory = '';

  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    while (cells.length < 9) {
      cells.push('');
    }

    const [categoryCell, priorityCell, itemCell, starCell, priceCell, linkCell, descriptionCell] =
      cells;

    const categoryTrimmed = categoryCell.trim();
    const itemTrimmed = itemCell.trim();

    // Category section header: "Toys:" with empty item
    if (categoryTrimmed.endsWith(':') && !itemTrimmed) {
      currentCategory = categoryTrimmed.replace(/:$/, '').trim();
      continue;
    }

    // Empty spacer rows
    if (!itemTrimmed && !linkCell.trim() && !descriptionCell.trim()) {
      continue;
    }

    if (!itemTrimmed) {
      continue;
    }

    const category = categoryTrimmed || currentCategory || undefined;
    const existingIndex = items.findIndex(
      (item) => item.name === itemTrimmed && (item.category || '') === (category || '')
    );

    if (existingIndex >= 0) {
      if (linkCell.trim() && !items[existingIndex].websiteLink) {
        items[existingIndex].websiteLink = linkCell.trim();
      } else if (linkCell.trim()) {
        warnings.push(`Item "${itemTrimmed}" has multiple links; keeping the first only.`);
      }
      continue;
    }

    const normalized = normalizeImportedItem({
      name: itemTrimmed,
      category,
      priority: priorityCell.trim() ? Number(priorityCell) : undefined,
      description: descriptionCell.trim() || undefined,
      price: parsePriceValue(priceCell),
      websiteLink: linkCell.trim() || undefined,
      isFavorite: starCell.trim() === '*',
    });

    if (normalized) {
      items.push(normalized);
    }
  }

  if (items.length === 0) {
    warnings.push('Giftistry CSV export contained no importable items.');
  }

  return { items, warnings };
}
