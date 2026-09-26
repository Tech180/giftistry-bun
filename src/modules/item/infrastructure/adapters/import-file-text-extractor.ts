import { AppError } from '@/common/domain/errors/app-error';
import type { ImportFileTextExtractor } from '../../domain/ports/import-file-text-extractor.port';
import type { ImportFileTextExtractorInput } from '../../domain/interfaces/import-file-text-extractor-input.interface';
import type { ImportFileTextExtractorResult } from '../../domain/interfaces/import-file-text-extractor-result.interface';
import { MAX_DECODED_BYTES } from '../constants/import-file-limits.constant';
import {
  decodeContent,
  detectFormat,
  pdfToText,
  truncateText,
} from '../utils/import-file-text.util';
import { workbookBytesToText } from '../utils/xlsx-workbook-to-text.util';

export class DefaultImportFileTextExtractor implements ImportFileTextExtractor {
  async extract(input: ImportFileTextExtractorInput): Promise<ImportFileTextExtractorResult> {
    const format = detectFormat(input.fileName, input.format);
    const warnings: string[] = [];
    const decoded = decodeContent(input.content, input.contentEncoding);

    let text = '';

    if (format === 'xlsx') {
      if (!decoded.bytes) {
        throw new AppError('XLSX imports require base64 or data-url encoding', 400, 'BAD_REQUEST');
      }
      try {
        text = await workbookBytesToText(decoded.bytes, {
          maxSheets: input.maxSheets,
          maxRowsPerSheet: input.maxRowsPerSheet,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Invalid XLSX file';
        throw new AppError(`Failed to read XLSX: ${message}`, 400, 'BAD_REQUEST');
      }
    } else if (format === 'pdf') {
      if (!decoded.bytes) {
        throw new AppError('PDF imports require base64 or data-url encoding', 400, 'BAD_REQUEST');
      }
      text = await pdfToText(decoded.bytes);
      if (!text.trim()) {
        warnings.push('No extractable text found in PDF.');
      }
    } else if (decoded.text !== undefined) {
      const encoder = new TextEncoder();
      if (encoder.encode(decoded.text).byteLength > MAX_DECODED_BYTES) {
        throw new AppError('Import file exceeds the 5MB size limit', 400, 'BAD_REQUEST');
      }
      text = decoded.text;
    } else if (decoded.bytes) {
      text = new TextDecoder('utf-8', { fatal: false }).decode(decoded.bytes);
    }

    const truncated = truncateText(text);
    if (truncated.truncated) {
      warnings.push('File content was truncated before AI parsing.');
    }

    return {
      text: truncated.text,
      format,
      warnings,
      truncated: truncated.truncated,
    };
  }
}
