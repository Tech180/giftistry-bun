import type { BackgroundJobItem } from '../../domain/interfaces/background-job-item.interface';
import type { BackgroundJobItemStatus } from '../../domain/interfaces/background-job-item-status.type';
import type { BackgroundJobItemRow } from '../interfaces/background-job-item-row.interface';

export function mapBackgroundJobItemRow(row: BackgroundJobItemRow): BackgroundJobItem {
  return {
    Id: String(row.id),
    JobId: String(row.job_id),
    ItemId: row.item_id ? String(row.item_id) : null,
    LinkUrl: row.link_url != null ? String(row.link_url) : null,
    Status: row.status as BackgroundJobItemStatus,
    Error: row.error != null ? String(row.error) : null,
    Payload: (row.payload ?? {}) as Record<string, unknown>,
    CreatedAt: row.created_at as Date | string,
    UpdatedAt: row.updated_at as Date | string,
  };
}
