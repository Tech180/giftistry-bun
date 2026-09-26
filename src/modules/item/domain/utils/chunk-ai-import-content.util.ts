import type { ImportedItemPreview } from '../interfaces/imported-item-preview.interface';
import type { AiImportChunkOptions } from '../interfaces/ai-import-chunk-options.interface';
import {
  AI_IMPORT_CHUNK_ITEM_LIMIT_MAX,
  AI_IMPORT_CHUNK_ITEM_LIMIT_MIN,
  DEFAULT_AI_IMPORT_CHUNKING_ENABLED,
  DEFAULT_AI_IMPORT_CHUNK_ITEM_LIMIT,
} from '../constants/ai-import-chunk.constant';

function resolveChunkOptions(options?: AiImportChunkOptions): {
  enabled: boolean;
  itemLimit: number;
} {
  const enabled =
    options?.enabled !== false &&
    (options?.enabled ?? DEFAULT_AI_IMPORT_CHUNKING_ENABLED);
  const rawLimit = options?.itemLimit ?? DEFAULT_AI_IMPORT_CHUNK_ITEM_LIMIT;
  const n = typeof rawLimit === 'number' ? rawLimit : Number(rawLimit);
  const itemLimit = Number.isFinite(n)
    ? Math.min(
        AI_IMPORT_CHUNK_ITEM_LIMIT_MAX,
        Math.max(AI_IMPORT_CHUNK_ITEM_LIMIT_MIN, Math.round(n))
      )
    : DEFAULT_AI_IMPORT_CHUNK_ITEM_LIMIT;
  return { enabled, itemLimit };
}

function itemDedupeKey(name: string, linkUrl?: string | null): string {
  return `${name.trim().toLowerCase()}\0${(linkUrl || '').trim().toLowerCase()}`;
}

function isSheetBanner(line: string): boolean {
  return /^#\s*Sheet:/i.test(line.trim());
}

function isHeaderLikeRow(line: string): boolean {
  const trimmed = line.trim();
  return (
    /category|item|name|price|link|url|description/i.test(trimmed) &&
    !/^https?:\/\//i.test(trimmed)
  );
}

/**
 * Estimate candidate gift rows from extracted import text
 * (non-empty lines minus sheet banners and a likely header row).
 */
export function estimateImportRowCount(fileContent: string): number {
  const lines = fileContent.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  let count = 0;
  let sawSheetHeader = false;
  for (const line of lines) {
    if (isSheetBanner(line)) {
      sawSheetHeader = true;
      continue;
    }
    // Skip a single header-looking row right after a sheet banner or at start.
    if ((sawSheetHeader || count === 0) && isHeaderLikeRow(line)) {
      sawSheetHeader = false;
      continue;
    }
    sawSheetHeader = false;
    count += 1;
  }
  return count;
}

export function shouldChunkAiImportContent(
  fileContent: string,
  options?: AiImportChunkOptions
): boolean {
  const { enabled, itemLimit } = resolveChunkOptions(options);
  if (!enabled) return false;
  return estimateImportRowCount(fileContent) > itemLimit;
}

/**
 * Split import text into AI-sized chunks by item-row count while preserving
 * `# Sheet:` banners and the first data/header row of each sheet on every chunk.
 */
export function splitAiImportFileContent(
  fileContent: string,
  options?: AiImportChunkOptions
): string[] {
  const { enabled, itemLimit } = resolveChunkOptions(options);
  if (!enabled || !shouldChunkAiImportContent(fileContent, { enabled, itemLimit })) {
    return [fileContent];
  }

  const rawLines = fileContent.split(/\r?\n/);
  const chunks: string[] = [];
  let sheetBanner: string | null = null;
  let sheetHeaderRow: string | null = null;
  let pendingHeaderCapture = false;
  let currentItems: string[] = [];

  const flush = () => {
    if (currentItems.length === 0) return;
    const parts: string[] = [];
    if (sheetBanner) parts.push(sheetBanner);
    if (sheetHeaderRow) parts.push(sheetHeaderRow);
    parts.push(...currentItems);
    chunks.push(parts.join('\n'));
    currentItems = [];
  };

  for (const line of rawLines) {
    const trimmed = line.trim();
    if (isSheetBanner(trimmed)) {
      flush();
      sheetBanner = line;
      sheetHeaderRow = null;
      pendingHeaderCapture = true;
      continue;
    }

    if (!trimmed) {
      continue;
    }

    if (pendingHeaderCapture) {
      sheetHeaderRow = line;
      pendingHeaderCapture = false;
      continue;
    }

    if (!sheetHeaderRow && currentItems.length === 0 && isHeaderLikeRow(trimmed)) {
      sheetHeaderRow = line;
      continue;
    }

    currentItems.push(line);
    if (currentItems.length >= itemLimit) {
      flush();
    }
  }

  flush();
  return chunks.length > 0 ? chunks : [fileContent];
}

/** Merge AI import previews; first occurrence of name+link wins. */
export function mergeAiImportItems(batches: ImportedItemPreview[][]): ImportedItemPreview[] {
  const seen = new Set<string>();
  const merged: ImportedItemPreview[] = [];
  for (const batch of batches) {
    for (const item of batch) {
      const key = itemDedupeKey(item.name, item.websiteLink);
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
    }
  }
  return merged;
}

/**
 * True when AI returned far fewer items than the estimated row count.
 */
export function isAiImportUnderCount(itemCount: number, estimatedRows: number): boolean {
  if (estimatedRows <= 0) return false;
  const threshold = Math.max(3, Math.floor(estimatedRows * 0.25));
  return itemCount < threshold;
}

export function formatAiImportUnderCountWarning(
  itemCount: number,
  estimatedRows: number
): string {
  return `AI returned only ${itemCount} item${itemCount === 1 ? '' : 's'} from ~${estimatedRows} rows; results may be incomplete.`;
}

export function formatAiImportChunkFailureWarning(
  failedCount: number,
  totalChunks: number
): string {
  return `${failedCount} of ${totalChunks} AI import chunk${totalChunks === 1 ? '' : 's'} failed; results may be incomplete.`;
}

export function formatAiImportAllChunksFailedError(totalChunks: number): string {
  return `All ${totalChunks} AI import chunks failed.`;
}
