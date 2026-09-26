import type { GrabPhase } from './grab-phase.type';
import type { JobProgressRate } from './job-progress-rate.interface';
import type { BackgroundJobItemStatus } from './background-job-item-status.type';

export interface JobActiveStream {
  Id: string;
  ItemId: string | null;
  Label: string;
  Status: BackgroundJobItemStatus;
  Phase?: GrabPhase | null;
  Detail?: string | null;
  ProgressRate?: JobProgressRate | null;
}
