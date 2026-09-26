import type { ImportedItemPreview } from './imported-item-preview.interface';

export interface ParseAiImportChunksResult {
  items: ImportedItemPreview[];
  warnings: string[];
  failedChunkCount: number;
  totalChunks: number;
}
