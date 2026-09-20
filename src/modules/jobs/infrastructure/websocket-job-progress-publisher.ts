import { loadConfig } from '@/common/infrastructure/config.loader';
import type { BackgroundJob, BackgroundJobItem } from '../domain/background-job.entity';
import type {
  JobProgressEventType,
  JobProgressPublisher,
} from '../domain/ports/job-progress-publisher.port';
import { mapToJobPublicView } from '../application/map-to-job-public-view.util';

export type JobProgressTransport = (
  listId: string | null,
  userId: string | null,
  payload: Record<string, unknown>
) => void;

/** Adapter: domain port → transport wired at boot (WS or Postgres fanout). */
export class WebsocketJobProgressPublisher implements JobProgressPublisher {
  private transport: JobProgressTransport | null = null;

  setTransport(fn: JobProgressTransport | null): void {
    this.transport = fn;
  }

  publish(
    job: BackgroundJob,
    type: JobProgressEventType,
    items?: BackgroundJobItem[] | null
  ): void {
    if (!this.transport) {
      return;
    }
    if (!job.ListId && !job.UserId) {
      return;
    }
    this.transport(job.ListId || null, job.UserId || null, {
      Type: type,
      Job: mapToJobPublicView(job, items, { load: loadConfig }),
    });
  }
}
