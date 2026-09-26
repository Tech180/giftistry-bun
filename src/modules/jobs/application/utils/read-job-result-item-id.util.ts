import type { BackgroundJob } from '../../domain/interfaces/background-job.interface';

export function readJobResultItemId(job: BackgroundJob): string | null {
  const result = job.Result;
  if (!result || typeof result !== 'object') return null;
  const itemId = (result as Record<string, unknown>).ItemId;
  return typeof itemId === 'string' && itemId.trim() ? itemId : null;
}
