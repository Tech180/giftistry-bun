import type { ImportedItemPreview } from '../interfaces/imported-item-preview.interface';
import {
  findGiftistryTabularHeader,
  isSheetPreambleLine,
  normalizeImportedItem,
  parseDelimitedLine,
  parsePriceValue,
} from './giftistry-export-detect.util';
import type { ParseGiftistryCsvResult } from '../interfaces/parse-giftistry-csv-result.interface';

export function tryParseGiftistryExportCsv(text: string): ParseGiftistryCsvResult | null {
  const header = findGiftistryTabularHeader(text);
  if (!header) {
    return null;
  }

  const { headerIndex, delimiter, lines } = header;
  const warnings: string[] = [];
  const items: ImportedItemPreview[] = [];
  let currentCategory = '';

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) {
      continue;
    }
    if (!line.trim() || isSheetPreambleLine(line)) {
      continue;
    }

    const cells = parseDelimitedLine(line, delimiter);
    while (cells.length < 9) {
      cells.push('');
    }

    const categoryCell = cells[0] ?? '';
    const priorityCell = cells[1] ?? '';
    const itemCell = cells[2] ?? '';
    const starCell = cells[3] ?? '';
    const priceCell = cells[4] ?? '';
    const linkCell = cells[5] ?? '';
    const descriptionCell = cells[6] ?? '';

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
      const existing = items[existingIndex];
      if (existing) {
        if (linkCell.trim() && !existing.websiteLink) {
          existing.websiteLink = linkCell.trim();
        } else if (linkCell.trim()) {
          warnings.push(`Item "${itemTrimmed}" has multiple links; keeping the first only.`);
        }
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
