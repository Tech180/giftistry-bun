import { tryParseGiftistryExportCsv } from './parse-giftistry-export-csv.util';
import { tryParseGiftistryExportJson } from './parse-giftistry-export-json.util';
import { tryParseGiftistryExportMd } from './parse-giftistry-export-md.util';
import { tryParseGiftistryExportTxt } from './parse-giftistry-export-txt.util';
import {
  isGiftistryExportMarkdown,
  isGiftistryExportTxt,
} from './giftistry-export-detect.util';
import type { ImportFileFormat } from '../types/import-file-format.type';
import type { ImportPreviewResult } from '../interfaces/import-preview-result.interface';

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
