import type { JobProgressRate } from '@/modules/jobs';

export interface ParseImportPreviewProgress {
  message: string;
  progressDone?: number;
  ProgressRate?: JobProgressRate | null;
}
