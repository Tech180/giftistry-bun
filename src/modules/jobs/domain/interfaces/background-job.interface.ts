import type { BackgroundJobKind } from './background-job-kind.type';
import type { BackgroundJobPayload } from './background-job-payload.type';
import type { BackgroundJobPhase } from './background-job-phase.type';
import type { BackgroundJobStatus } from './background-job-status.type';

export interface BackgroundJob {
  Id: string;
  Kind: BackgroundJobKind;
  ListId: string | null;
  UserId: string;
  Status: BackgroundJobStatus;
  Phase: BackgroundJobPhase;
  ProgressDone: number;
  ProgressTotal: number;
  Message: string;
  Error: string | null;
  Payload: BackgroundJobPayload;
  Result: Record<string, unknown>;
  CreatedAt: Date | string;
  UpdatedAt: Date | string;
  StartedAt: Date | string | null;
  FinishedAt: Date | string | null;
}
