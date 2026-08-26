import { tryParseGiftistryExportCsv } from './parse-giftistry-export-csv';
import { tryParseGiftistryExportJson } from './parse-giftistry-export-json';
import { tryParseGiftistryExportMd } from './parse-giftistry-export-md';
import { tryParseGiftistryExportTxt } from './parse-giftistry-export-txt';
import {
  isGiftistryExportMarkdown,
  isGiftistryExportTxt,
} from './giftistry-export-detect';
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

  if (sourceFormat === 'txt' || sourceFormat === 'unknown' || isGiftistryExportTxt(trimmed)) {
    const txtResult = tryParseGiftistryExportTxt(trimmed);
    if (txtResult) {
      return {
        items: txtResult.items,
        warnings: txtResult.warnings,
        sourceFormat: 'txt',
        parseMode: 'deterministic',
        suggestedWishlistTitle: txtResult.suggestedWishlistTitle,
      };
    }
  }

  if (
    sourceFormat === 'md' ||
    sourceFormat === 'unknown' ||
    sourceFormat === 'txt' ||
    isGiftistryExportMarkdown(trimmed)
  ) {
    const mdResult = tryParseGiftistryExportMd(trimmed);
    if (mdResult) {
      return {
        items: mdResult.items,
        warnings: mdResult.warnings,
        sourceFormat: 'md',
        parseMode: 'deterministic',
        suggestedWishlistTitle: mdResult.suggestedWishlistTitle,
      };
    }
  }

  if (
    sourceFormat === 'csv' ||
    sourceFormat === 'xlsx' ||
    sourceFormat === 'unknown' ||
    sourceFormat === 'txt'
  ) {
    const csvResult = tryParseGiftistryExportCsv(trimmed);
    if (csvResult) {
      return {
        items: csvResult.items,
        warnings: csvResult.warnings,
        sourceFormat: sourceFormat === 'xlsx' ? 'xlsx' : 'csv',
        parseMode: 'deterministic',
      };
    }
  }

  return null;
}
