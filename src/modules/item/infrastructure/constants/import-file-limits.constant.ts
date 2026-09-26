import type { ImportFileFormat } from '../../domain/types/import-file-format.type';

export const MAX_DECODED_BYTES = 5 * 1024 * 1024;
export const MAX_LLM_CHARS = 100_000;

export const EXT_TO_FORMAT: Record<string, ImportFileFormat> = {
  csv: 'csv',
  xlsx: 'xlsx',
  txt: 'txt',
  json: 'json',
  md: 'md',
  markdown: 'md',
  pdf: 'pdf',
};
