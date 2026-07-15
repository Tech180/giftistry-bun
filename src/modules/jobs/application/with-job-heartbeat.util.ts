import type { BackgroundJobRepository } from '../domain/ports/background-job.repository';

/** Keep running jobs ahead of stale-reclaim while a long await is in flight. */
export const JOB_HEARTBEAT_INTERVAL_MS = 30_000;

/**
 * Periodically bumps `updated_at` via empty progress patches so reclaim does not
 * re-queue a job that is still actively working (e.g. AI import parse).
 */
export async function withJobHeartbeat<T>(
  jobRepo: BackgroundJobRepository,
  jobId: string,
  work: Promise<T>,
  intervalMs = JOB_HEARTBEAT_INTERVAL_MS
): Promise<T> {
  const timer = setInterval(() => {
    void jobRepo.updateProgress(jobId, {}).catch(() => {
      /* ignore transient heartbeat failures */
    });
  }, intervalMs);

  try {
    return await work;
  } finally {
    clearInterval(timer);
  }
}
