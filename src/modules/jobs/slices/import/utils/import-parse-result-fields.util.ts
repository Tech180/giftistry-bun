import type { ImportPreviewResult } from '@/modules/item';

export function buildImportParseResultFields(preview: ImportPreviewResult): Record<string, unknown> {
  const parsedCount = preview.items.filter((item) => item.name.trim()).length;
  return {
    ParseMode: preview.parseMode,
    ParsedCount: parsedCount,
    InputTruncated: preview.inputTruncated === true,
    ...(preview.warnings.length > 0 ? { Warnings: preview.warnings } : {}),
  };
}

export function pickImportParseResultFields(
  result: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  if (!result) return {};
  const out: Record<string, unknown> = {};
  if (typeof result.ParseMode === 'string') out.ParseMode = result.ParseMode;
  if (typeof result.ParsedCount === 'number') out.ParsedCount = result.ParsedCount;
  if (typeof result.InputTruncated === 'boolean') out.InputTruncated = result.InputTruncated;
  if (Array.isArray(result.Warnings)) out.Warnings = result.Warnings;
  if (typeof result.Created === 'number') out.Created = result.Created;
  if (typeof result.Failed === 'number') out.Failed = result.Failed;
  if (typeof result.GrabFailed === 'number') out.GrabFailed = result.GrabFailed;
  return out;
}
