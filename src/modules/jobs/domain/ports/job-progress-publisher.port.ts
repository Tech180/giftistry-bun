import type { BackgroundJob } from '../interfaces/background-job.interface';
import type { BackgroundJobItem } from '../interfaces/background-job-item.interface';
import type { JobProgressEventType } from '../interfaces/job-progress-event-type.type';

export interface JobProgressPublisher {
  publish(
    job: BackgroundJob,
    type: JobProgressEventType,
    items?: BackgroundJobItem[] | null
  ): void;
}
