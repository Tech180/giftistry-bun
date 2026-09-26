import type { BackgroundJobItem } from '../../../domain/interfaces/background-job-item.interface';
import type { CreatedImportRow } from '../interfaces/created-import-row.interface';

/** Rows still needing grab-info (pending/failed with a link). */
export function collectGrabWorkRows(jobItems: BackgroundJobItem[]): CreatedImportRow[] {
  const workRows: CreatedImportRow[] = [];

  for (const item of jobItems) {
    if (item.Status !== 'pending' && item.Status !== 'failed') {
      continue;
    }
    const linkUrl =
      item.LinkUrl?.trim() || String(item.Payload?.linkUrl ?? '').trim() || null;
    if (!linkUrl || !item.ItemId) {
      continue;
    }
    const payload = item.Payload || {};
    workRows.push({
      itemId: item.ItemId,
      linkUrl,
      name: String(payload.name ?? 'Item'),
      description: (payload.description as string | null) ?? null,
      category: String(payload.category ?? 'uncategorized'),
      priority: (payload.priority as number | null) ?? null,
      price: (payload.price as number | null) ?? null,
      websiteName: (payload.websiteName as string | null) ?? null,
    });
  }

  return workRows;
}
