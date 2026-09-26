import type { BackgroundJobItemStatus } from './background-job-item-status.type';

export interface InsertBackgroundJobItemInput {
  itemId: string | null;
  linkUrl: string | null;
  payload: Record<string, unknown>;
  status?: BackgroundJobItemStatus;
}
