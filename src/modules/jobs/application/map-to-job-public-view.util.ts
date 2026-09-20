import {
  toJobPublicView,
  type BackgroundJob,
  type BackgroundJobItem,
} from '../domain/background-job.entity';

export type JobPublicViewConfigSource = {
  load(): { GrabInfoActiveStreamLimit?: number };
};

/** Maps a job to the public DTO using server config for stream limits when provided. */
export function mapToJobPublicView(
  job: BackgroundJob,
  items?: BackgroundJobItem[] | null,
  serverConfig?: JobPublicViewConfigSource
) {
  return toJobPublicView(job, items, {
    activeStreamLimit: serverConfig?.load().GrabInfoActiveStreamLimit,
  });
}
