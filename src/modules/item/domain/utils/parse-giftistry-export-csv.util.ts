import type { GiftistryTabularColumnKey } from '../types/giftistry-tabular-column-key.type';
import type { ImportedItemPreview } from '../interfaces/imported-item-preview.interface';
import {
  findGiftistryTabularHeader,
  isSheetPreambleLine,
  normalizeImportedItem,
  parseDelimitedLine,
  parsePriceValue,
} from './giftistry-export-detect.util';
import { splitExportRelationNames } from './split-export-relation-names.util';
import type { ParseGiftistryCsvResult } from '../interfaces/parse-giftistry-csv-result.interface';

function cellAt(
  cells: string[],
  columns: Partial<Record<GiftistryTabularColumnKey, number>>,
  key: GiftistryTabularColumnKey
): string {
  const index = columns[key];
  if (index === undefined) {
    return '';
  }
  return cells[index] ?? '';
}

function attachRelationFields(
  item: ImportedItemPreview,
  audience: string,
  suggestion: string,
  linked: string,
  related: string
): ImportedItemPreview {
  const audienceLabel = audience.trim() || undefined;
  const suggestionLabel = suggestion.trim() || undefined;
  const linkedPeerNames = splitExportRelationNames(linked);
  const relatedPeerNames = splitExportRelationNames(related);
  return {
    ...item,
    ...(audienceLabel ? { audienceLabel } : {}),
    ...(suggestionLabel ? { suggestionLabel } : {}),
    ...(linkedPeerNames.length ? { linkedPeerNames } : {}),
    ...(relatedPeerNames.length ? { relatedPeerNames } : {}),
  };
}

export function tryParseGiftistryExportCsv(text: string): ParseGiftistryCsvResult | null {
  const header = findGiftistryTabularHeader(text);
  if (!header) {
    return null;
  }

  const { headerIndex, delimiter, lines, columnCount, columnIndexByKey } = header;
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
    while (cells.length < columnCount) {
      cells.push('');
    }

    const categoryCell = cellAt(cells, columnIndexByKey, 'category');
    const priorityCell = cellAt(cells, columnIndexByKey, 'priority');
    const itemCell = cellAt(cells, columnIndexByKey, 'item');
    const starCell = cellAt(cells, columnIndexByKey, 'star');
    const priceCell = cellAt(cells, columnIndexByKey, 'price');
    const linkCell = cellAt(cells, columnIndexByKey, 'website');
    const descriptionCell = cellAt(cells, columnIndexByKey, 'description');
    const audienceCell = cellAt(cells, columnIndexByKey, 'audience');
    const suggestionCell = cellAt(cells, columnIndexByKey, 'suggestion');
    const linkedCell = cellAt(cells, columnIndexByKey, 'linkedItems');
    const relatedCell = cellAt(cells, columnIndexByKey, 'relatedItems');

    const categoryTrimmed = categoryCell.trim();
    const itemTrimmed = itemCell.trim();

    if (categoryTrimmed.endsWith(':') && !itemTrimmed) {
      currentCategory = categoryTrimmed.replace(/:$/, '').trim();
      continue;
    }

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
        if (!existing.linkedPeerNames?.length && linkedCell.trim()) {
          existing.linkedPeerNames = splitExportRelationNames(linkedCell);
        }
        if (!existing.relatedPeerNames?.length && relatedCell.trim()) {
          existing.relatedPeerNames = splitExportRelationNames(relatedCell);
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
      items.push(
        attachRelationFields(normalized, audienceCell, suggestionCell, linkedCell, relatedCell)
      );
    }
  }

  if (items.length === 0) {
    warnings.push('Giftistry CSV export contained no importable items.');
  }

  return { items, warnings };
}
