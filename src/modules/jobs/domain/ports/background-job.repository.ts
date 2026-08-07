import type {
  BackgroundJob,
  BackgroundJobItem,
  BackgroundJobItemStatus,
  BackgroundJobKind,
  BackgroundJobPayload,
  BackgroundJobPhase,
  BackgroundJobStatus,
} from '../background-job.entity';
import type { JobProgressRate } from '../job-progress-rate.util';

export interface CreateBackgroundJobInput {
  kind: BackgroundJobKind;
  userId: string;
  listId?: string | null;
  payload: BackgroundJobPayload;
}

export interface BackgroundJobRepository {
  create(input: CreateBackgroundJobInput): Promise<BackgroundJob>;
  findById(id: string): Promise<BackgroundJob | null>;
  findActiveByListId(listId: string): Promise<BackgroundJob | null>;
  claimNextQueued(): Promise<BackgroundJob | null>;
  updateProgress(
    id: string,
    patch: {
      listId?: string | null;
      status?: BackgroundJobStatus;
      phase?: BackgroundJobPhase;
      progressDone?: number;
      progressTotal?: number;
      message?: string;
      error?: string | null;
      result?: Record<string, unknown>;
      /** Live rate stored in Result.ProgressRate; null clears it. */
      progressRate?: JobProgressRate | null;
      startedAt?: Date | null;
      finishedAt?: Date | null;
    }
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
    rows: Array<{
      itemId: string | null;
      linkUrl: string | null;
      payload: Record<string, unknown>;
      status?: BackgroundJobItemStatus;
    }>
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
