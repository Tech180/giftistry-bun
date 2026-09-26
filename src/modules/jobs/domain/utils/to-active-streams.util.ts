import type { BackgroundJobItem } from '../interfaces/background-job-item.interface';
import type { JobActiveStream } from '../interfaces/job-active-stream.interface';
import {
  formatGrabPhaseDetail,
  readGrabPhase,
  streamProgressRateFromPayload,
} from './grab-item-phase.util';

function streamLabel(item: BackgroundJobItem): string {
  const payload = item.Payload || {};
  const name = typeof payload.name === 'string' && payload.name.trim() ? payload.name.trim() : '';
  if (name) return name;

  const url = item.LinkUrl?.trim();
  if (url) {
    try {
      return new URL(url).hostname.replace(/^www\./, '') || url;
    } catch {
      return url;
    }
  }
  return 'Item';
}

export function toActiveStreams(
  items: BackgroundJobItem[],
  limit: number
): JobActiveStream[] {
  return items
    .filter((item) => item.Status === 'running' || item.Status === 'pending')
    .slice(0, Math.max(1, limit))
    .map((item) => {
      const phase = readGrabPhase(item.Payload);
      const detail = formatGrabPhaseDetail(phase);
      const progressRate = streamProgressRateFromPayload(item.Payload);
      const stream: JobActiveStream = {
        Id: item.Id,
        ItemId: item.ItemId,
        Label: streamLabel(item),
        Status: item.Status,
      };
      if (phase) stream.Phase = phase;
      if (detail) stream.Detail = detail;
      if (progressRate) stream.ProgressRate = progressRate;
      return stream;
    });
}
