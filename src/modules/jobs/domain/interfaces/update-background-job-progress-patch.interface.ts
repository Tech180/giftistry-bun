import type { BackgroundJobPhase } from './background-job-phase.type';
import type { BackgroundJobStatus } from './background-job-status.type';
import type { JobProgressRate } from './job-progress-rate.interface';

export interface UpdateBackgroundJobProgressPatch {
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
