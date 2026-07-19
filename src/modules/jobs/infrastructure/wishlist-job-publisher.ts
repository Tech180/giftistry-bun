import type { BackgroundJob, BackgroundJobItem } from '../domain/background-job.entity';
import { toJobPublicView } from '../domain/background-job.entity';

export type WishlistJobPublisher = (
  listId: string | null,
  userId: string | null,
  payload: Record<string, unknown>
) => void;

let publisher: WishlistJobPublisher | null = null;

export function setWishlistJobPublisher(fn: WishlistJobPublisher | null): void {
  publisher = fn;
}

export function publishJobProgress(
  job: BackgroundJob,
  type: 'job.progress' | 'job.completed' | 'job.failed',
  items?: BackgroundJobItem[] | null
): void {
  if (!publisher) return;
  if (!job.ListId && !job.UserId) return;
  publisher(job.ListId || null, job.UserId || null, {
    Type: type,
    Job: toJobPublicView(job, items),
  });
}
