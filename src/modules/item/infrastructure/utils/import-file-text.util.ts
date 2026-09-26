import { PDFParse } from 'pdf-parse';
import { AppError } from '@/common/domain/errors/app-error';
import type { ImportFileFormat } from '../../domain/types/import-file-format.type';
import type { ImportFileTextExtractorInput } from '../../domain/interfaces/import-file-text-extractor-input.interface';
import {
  EXT_TO_FORMAT,
  MAX_DECODED_BYTES,
  MAX_LLM_CHARS,
} from '../constants/import-file-limits.constant';

export function detectFormat(fileName: string, format?: ImportFileFormat): ImportFileFormat {
  if (format && format !== 'unknown') {
    return format;
  }
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return EXT_TO_FORMAT[ext] || 'unknown';
}

export function decodeContent(
  content: string,
  encoding: ImportFileTextExtractorInput['contentEncoding']
): {
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

export function truncateText(text: string): { text: string; truncated: boolean } {
  if (text.length <= MAX_LLM_CHARS) {
    return { text, truncated: false };
  }
  return { text: text.slice(0, MAX_LLM_CHARS), truncated: true };
}

export async function pdfToText(bytes: Uint8Array): Promise<string> {
  const parser = new PDFParse({ data: bytes });
  try {
    const result = await parser.getText();
    return result.text || '';
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}
