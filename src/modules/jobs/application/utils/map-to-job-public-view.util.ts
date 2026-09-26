import { clampGrabInfoActiveStreamLimit } from '@/modules/system';
import { toJobPublicView } from '../../domain/utils/to-job-public-view.util';
import type { BackgroundJob } from '../../domain/interfaces/background-job.interface';
import type { BackgroundJobItem } from '../../domain/interfaces/background-job-item.interface';
import type { JobPublicViewConfigSource } from '../interfaces/job-public-view-config-source.type';

/** Maps a job to the public DTO using server config for stream limits when provided. */
export function mapToJobPublicView(
  job: BackgroundJob,
  items?: BackgroundJobItem[] | null,
  serverConfig?: JobPublicViewConfigSource
) {
  return toJobPublicView(job, items, {
    activeStreamLimit: clampGrabInfoActiveStreamLimit(
      serverConfig?.load().GrabInfoActiveStreamLimit
    ),
  });
}
