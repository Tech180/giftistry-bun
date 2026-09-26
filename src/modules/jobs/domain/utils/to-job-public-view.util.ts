import type { BackgroundJob } from '../interfaces/background-job.interface';
import type { BackgroundJobItem } from '../interfaces/background-job-item.interface';
import type { ItemEnrichJobPayload } from '../interfaces/item-enrich-job-payload.type';
import type { ItemSummarizeJobPayload } from '../interfaces/item-summarize-job-payload.type';
import type { ToJobPublicViewOptions } from '../interfaces/to-job-public-view-options.interface';
import type { WishlistImportJobPayload } from '../interfaces/wishlist-import-job-payload.interface';
import { summarizeJobItems } from './summarize-job-items.util';
import { toActiveStreams } from './to-active-streams.util';
import { readResultProgressRate } from './job-progress-rate.util';

export function toJobPublicView(
  job: BackgroundJob,
  items?: BackgroundJobItem[] | null,
  options?: ToJobPublicViewOptions
) {
  const view: Record<string, unknown> = {
    Id: job.Id,
    Kind: job.Kind,
    ListId: job.ListId,
    UserId: job.UserId,
    Status: job.Status,
    Phase: job.Phase,
    ProgressDone: job.ProgressDone,
    ProgressTotal: job.ProgressTotal,
    Message: job.Message,
    Error: job.Error,
    Result: job.Result,
    CreatedAt: job.CreatedAt,
    UpdatedAt: job.UpdatedAt,
    StartedAt: job.StartedAt,
    FinishedAt: job.FinishedAt,
  };

  const progressRate = readResultProgressRate(job.Result);
  if (progressRate) {
    view.ProgressRate = progressRate;
  }

  if (job.Kind === 'wishlist-import') {
    const payload = job.Payload as WishlistImportJobPayload;
    view.GrabInfo = !!payload?.grabInfo;
    view.Mode = payload?.mode;
    view.FileName = payload?.fileName;
  }

  if (job.Kind === 'item-enrich') {
    const payload = job.Payload as ItemEnrichJobPayload;
    view.Intent = payload.intent;
    view.WriteBack = payload.intent !== 'draft-populate';
  }

  if (job.Kind === 'item-summarize') {
    const payload = job.Payload as ItemSummarizeJobPayload;
    view.WriteBack = payload.writeBack === true;
  }

  if (items && items.length > 0) {
    view.ItemsSummary = summarizeJobItems(items);
    const streamLimit = Math.max(1, options?.activeStreamLimit ?? 1);
    const streams = toActiveStreams(items, streamLimit);
    if (streams.length > 0) {
      view.ActiveStreams = streams;
    }
  }

  return view;
}
