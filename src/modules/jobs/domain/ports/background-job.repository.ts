import type {
  BackgroundJob,
  BackgroundJobItem,
  BackgroundJobItemStatus,
  BackgroundJobPhase,
  BackgroundJobStatus,
  WishlistImportJobPayload,
} from '../background-job.entity';

export interface CreateBackgroundJobInput {
  kind: 'wishlist-import';
  userId: string;
  listId?: string | null;
  payload: WishlistImportJobPayload;
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
}
