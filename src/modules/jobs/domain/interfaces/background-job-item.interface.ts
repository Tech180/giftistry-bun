import type { BackgroundJobItemStatus } from './background-job-item-status.type';

export interface BackgroundJobItem {
  Id: string;
  JobId: string;
  ItemId: string | null;
  LinkUrl: string | null;
  Status: BackgroundJobItemStatus;
  Error: string | null;
  Payload: Record<string, unknown>;
  CreatedAt: Date | string;
  UpdatedAt: Date | string;
}
