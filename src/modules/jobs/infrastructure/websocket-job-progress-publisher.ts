import type { BackgroundJob, BackgroundJobItem } from '../domain/background-job.entity';
import type {
  JobProgressEventType,
  JobProgressPublisher,
} from '../domain/ports/job-progress-publisher.port';
import { publishJobProgress } from './wishlist-job-publisher';

export class WebsocketJobProgressPublisher implements JobProgressPublisher {
  publish(
    job: BackgroundJob,
    type: JobProgressEventType,
    items?: BackgroundJobItem[] | null
  ): void {
    publishJobProgress(job, type, items);
  }
}
