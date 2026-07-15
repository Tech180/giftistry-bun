import type { BackgroundJob, BackgroundJobItem } from '../background-job.entity';

export type JobProgressEventType = 'job.progress' | 'job.completed' | 'job.failed';

export interface JobProgressPublisher {
  publish(
    job: BackgroundJob,
    type: JobProgressEventType,
    items?: BackgroundJobItem[] | null
  ): void;
}
