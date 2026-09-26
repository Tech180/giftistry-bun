import type { BackgroundJob } from '../interfaces/background-job.interface';
import type { BackgroundJobItem } from '../interfaces/background-job-item.interface';
import type { BackgroundJobItemStatus } from '../interfaces/background-job-item-status.type';
import type { CreateBackgroundJobInput } from '../interfaces/create-background-job-input.interface';
import type { InsertBackgroundJobItemInput } from '../interfaces/insert-background-job-item-input.interface';
import type { UpdateBackgroundJobProgressPatch } from '../interfaces/update-background-job-progress-patch.interface';

export interface BackgroundJobRepository {
  create(input: CreateBackgroundJobInput): Promise<BackgroundJob>;
  findById(id: string): Promise<BackgroundJob | null>;
  findActiveByListId(listId: string): Promise<BackgroundJob | null>;
  claimNextQueued(): Promise<BackgroundJob | null>;
  updateProgress(
    id: string,
    patch: UpdateBackgroundJobProgressPatch
  ): Promise<BackgroundJob | null>;
  requestCancel(id: string, userId: string): Promise<BackgroundJob | null>;
  requestCancelAny(id: string): Promise<BackgroundJob | null>;
  requestSuspend(id: string, userId: string): Promise<BackgroundJob | null>;
  requestSuspendAny(id: string): Promise<BackgroundJob | null>;
  requestResume(id: string, userId: string): Promise<BackgroundJob | null>;
  requestResumeAny(id: string): Promise<BackgroundJob | null>;
  cancelActiveByListId(listId: string): Promise<number>;
  listActiveByUserId(userId: string): Promise<BackgroundJob[]>;
  listActiveAll(): Promise<BackgroundJob[]>;
  reclaimStaleRunning(staleAfterMs: number): Promise<number>;
  shouldStop(id: string): Promise<boolean>;
  /** @deprecated use shouldStop */
  isCancelled(id: string): Promise<boolean>;
  insertItems(
    jobId: string,
    rows: InsertBackgroundJobItemInput[]
  ): Promise<BackgroundJobItem[]>;
  listItems(jobId: string): Promise<BackgroundJobItem[]>;
  updateItemStatus(
    id: string,
    status: BackgroundJobItemStatus,
    error?: string | null
  ): Promise<void>;
  /** JSON-merge patch into background_job_items.payload. */
  updateItemPayload(id: string, patch: Record<string, unknown>): Promise<void>;
}
