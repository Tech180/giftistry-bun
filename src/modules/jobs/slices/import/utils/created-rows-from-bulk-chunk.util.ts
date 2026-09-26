import type { CreatedImportRow } from '../interfaces/created-import-row.interface';

export function createdRowsFromBulkChunk(params: {
  chunk: Array<{ linkUrl?: string | null; price?: number | null }>;
  failedIndexes: Set<number>;
  createdItems: Array<{
    Id: string;
    Name: string;
    Description: string | null;
    Category: string;
    Priority?: number | null;
    Links?: Array<{
      Url: string;
      ExtractedPrice: number | null;
      RetailerName: string | null;
    }>;
  }>;
}): CreatedImportRow[] {
  const { chunk, failedIndexes, createdItems } = params;
  const createdRows: CreatedImportRow[] = [];
  let createdIndex = 0;

  for (let rowIndex = 0; rowIndex < chunk.length; rowIndex++) {
    if (failedIndexes.has(rowIndex)) {
      continue;
    }
    const inputRow = chunk[rowIndex];
    const created = createdItems[createdIndex++];
    if (!created) {
      continue;
    }
    const link = created.Links?.[0];
    createdRows.push({
      itemId: created.Id,
      linkUrl: link?.Url ?? inputRow?.linkUrl ?? null,
      name: created.Name,
      description: created.Description ?? null,
      category: created.Category || 'uncategorized',
      priority: created.Priority ?? null,
      price: link?.ExtractedPrice ?? inputRow?.price ?? null,
      websiteName: link?.RetailerName ?? null,
    });
  }

  return createdRows;
}
