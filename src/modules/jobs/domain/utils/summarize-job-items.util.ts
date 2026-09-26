import type { BackgroundJobItem } from '../interfaces/background-job-item.interface';
import type { JobItemsSummary } from '../interfaces/job-items-summary.interface';

export function summarizeJobItems(items: BackgroundJobItem[]): JobItemsSummary {
  const summary: JobItemsSummary = {
    Total: items.length,
    Pending: 0,
    Running: 0,
    Done: 0,
    Failed: 0,
    Skipped: 0,
  };
  for (const item of items) {
    switch (item.Status) {
      case 'pending':
        summary.Pending += 1;
        break;
      case 'running':
        summary.Running += 1;
        break;
      case 'done':
        summary.Done += 1;
        break;
      case 'failed':
        summary.Failed += 1;
        break;
      case 'skipped':
        summary.Skipped += 1;
        break;
    }
  }
  return summary;
}
