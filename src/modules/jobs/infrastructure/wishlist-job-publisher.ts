import type { BackgroundJob, BackgroundJobItem } from '../domain/background-job.entity';
import { toJobPublicView } from '../domain/background-job.entity';

export type WishlistJobPublisher = (listId: string, payload: Record<string, unknown>) => void;

let publisher: WishlistJobPublisher | null = null;

export function setWishlistJobPublisher(fn: WishlistJobPublisher | null): void {
  publisher = fn;
}

export function publishJobProgress(
  job: BackgroundJob,
  type: 'job.progress' | 'job.completed' | 'job.failed',
  items?: BackgroundJobItem[] | null
): void {
  if (!job.ListId || !publisher) return;
  publisher(job.ListId, {
    Type: type,
    Job: toJobPublicView(job, items),
  });
}
