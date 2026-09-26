import { loadConfig } from '@/common/config/utils/server-config-file.util';
import type { BackgroundJob } from '../../domain/interfaces/background-job.interface';
import type { BackgroundJobItem } from '../../domain/interfaces/background-job-item.interface';
import type { JobProgressEventType } from '../../domain/interfaces/job-progress-event-type.type';
import type { JobProgressPublisher } from '../../domain/ports/job-progress-publisher.port';
import { mapToJobPublicView } from '../../application/utils/map-to-job-public-view.util';
import type { JobProgressTransport } from '../interfaces/job-progress-transport.type';

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
