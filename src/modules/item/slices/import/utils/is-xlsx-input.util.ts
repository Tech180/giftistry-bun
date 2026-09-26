import type { ImportFileFormat } from '../../../domain/types/import-file-format.type';

export function isXlsxInput(format: ImportFileFormat | undefined, fileName: string): boolean {
  if (format === 'xlsx') {
    return true;
  }
  return fileName.split('.').pop()?.toLowerCase() === 'xlsx';
}
