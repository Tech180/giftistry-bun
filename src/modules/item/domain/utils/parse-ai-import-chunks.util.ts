import type { ImportedItemPreview } from '../interfaces/imported-item-preview.interface';
import { formatAiImportAllChunksFailedError, formatAiImportChunkFailureWarning, mergeAiImportItems, splitAiImportFileContent } from './chunk-ai-import-content.util';
import type { AiImportChunkOptions } from '../interfaces/ai-import-chunk-options.interface';
import type { ParseAiImportChunksResult } from '../interfaces/parse-ai-import-chunks-result.interface';

export async function parseAiImportChunks(
  fileContent: string,
  chunkOptions: AiImportChunkOptions,
  parseChunk: (
    chunkContent: string,
    meta: { index: number; total: number }
  ) => Promise<ImportedItemPreview[]>
): Promise<ParseAiImportChunksResult> {
  const chunks = splitAiImportFileContent(fileContent, chunkOptions);
  const totalChunks = chunks.length;
  const batches: ImportedItemPreview[][] = [];
  let failedChunkCount = 0;

  if (totalChunks === 1) {
    const only = chunks[0] ?? fileContent;
    const items = await parseChunk(only, { index: 0, total: 1 });
    return {
      items,
      warnings: [],
      failedChunkCount: 0,
      totalChunks: 1,
    };
  }

  for (let index = 0; index < totalChunks; index++) {
    const chunk = chunks[index];
    if (chunk === undefined) continue;
    try {
      const batch = await parseChunk(chunk, { index, total: totalChunks });
      batches.push(batch);
    } catch (err) {
      failedChunkCount += 1;
      console.error(`[AI Import] Chunk ${index + 1}/${totalChunks} failed:`, err);
    }
  }

  if (failedChunkCount === totalChunks) {
    throw new Error(formatAiImportAllChunksFailedError(totalChunks));
  }

  const warnings: string[] = [];
  if (failedChunkCount > 0) {
    warnings.push(formatAiImportChunkFailureWarning(failedChunkCount, totalChunks));
  }

  return {
    items: mergeAiImportItems(batches),
    warnings,
    failedChunkCount,
    totalChunks,
  };
}
