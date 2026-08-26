import { PDFParse } from 'pdf-parse';
import { AppError } from '@/common/middlewares/error.middleware';
import type { ImportFileFormat } from '../domain/imported-item-preview';
import type {
  ImportFileTextExtractor,
  ImportFileTextExtractorInput,
  ImportFileTextExtractorResult,
} from '../domain/ports/import-file-text-extractor.port';
import {
  cellValueToText,
  workbookBytesToText,
} from './xlsx-workbook-to-text.util';

export { cellValueToText };

const MAX_DECODED_BYTES = 5 * 1024 * 1024;
const MAX_LLM_CHARS = 100_000;

const EXT_TO_FORMAT: Record<string, ImportFileFormat> = {
  csv: 'csv',
  xlsx: 'xlsx',
  txt: 'txt',
  json: 'json',
  md: 'md',
  markdown: 'md',
  pdf: 'pdf',
};

function detectFormat(fileName: string, format?: ImportFileFormat): ImportFileFormat {
  if (format && format !== 'unknown') {
    return format;
  }
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return EXT_TO_FORMAT[ext] || 'unknown';
}

function decodeContent(content: string, encoding: ImportFileTextExtractorInput['contentEncoding']): {
  text?: string;
  bytes?: Uint8Array;
} {
  if (encoding === 'text') {
    return { text: content };
  }

  let base64 = content;
  if (encoding === 'data-url') {
    const commaIndex = content.indexOf(',');
    base64 = commaIndex >= 0 ? content.slice(commaIndex + 1) : content;
  }

  const binary = Buffer.from(base64, 'base64');
  if (binary.byteLength > MAX_DECODED_BYTES) {
    throw new AppError('Import file exceeds the 5MB size limit', 400, 'BAD_REQUEST');
  }
  return { bytes: new Uint8Array(binary) };
}

function truncateText(text: string): { text: string; truncated: boolean } {
  if (text.length <= MAX_LLM_CHARS) {
    return { text, truncated: false };
  }
  return { text: text.slice(0, MAX_LLM_CHARS), truncated: true };
}

async function pdfToText(bytes: Uint8Array): Promise<string> {
  const parser = new PDFParse({ data: bytes });
  try {
    const result = await parser.getText();
    return result.text || '';
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}

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
        text = await workbookBytesToText(decoded.bytes);
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
