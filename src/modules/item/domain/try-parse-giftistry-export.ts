import { tryParseGiftistryExportCsv } from './parse-giftistry-export-csv';
import { tryParseGiftistryExportJson } from './parse-giftistry-export-json';
import type { ImportFileFormat, ImportPreviewResult } from '../imported-item-preview';

export function tryParseGiftistryExportDeterministic(
  text: string,
  sourceFormat: ImportFileFormat
): ImportPreviewResult | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }

  if (sourceFormat === 'json' || trimmed.startsWith('{') || trimmed.startsWith('[')) {
    const jsonResult = tryParseGiftistryExportJson(trimmed);
    if (jsonResult) {
      return {
        items: jsonResult.items,
        warnings: jsonResult.warnings,
        sourceFormat: 'json',
        parseMode: 'deterministic',
        suggestedWishlistTitle: jsonResult.suggestedWishlistTitle,
      };
    }
  }

  if (sourceFormat === 'csv' || sourceFormat === 'unknown' || sourceFormat === 'txt') {
    const csvResult = tryParseGiftistryExportCsv(trimmed);
    if (csvResult) {
      return {
        items: csvResult.items,
        warnings: csvResult.warnings,
        sourceFormat: 'csv',
        parseMode: 'deterministic',
      };
    }
  }

  return null;
}
