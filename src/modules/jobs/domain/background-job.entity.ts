import { loadConfig } from '@/common/infrastructure/config.loader';
import { clampGrabInfoActiveStreamLimit } from '@/modules/system/domain/server-config.entity';
import { readResultProgressRate } from './job-progress-rate.util';
import {
  formatGrabPhaseDetail,
  readGrabPhase,
  streamProgressRateFromPayload,
  type GrabPhase,
} from './grab-item-phase.util';

export type BackgroundJobKind = 'wishlist-import' | 'item-enrich' | 'item-summarize';

export type BackgroundJobStatus = 'queued' | 'running' | 'suspended' | 'completed' | 'failed' | 'cancelled';

export type BackgroundJobPhase =
  | 'queued'
  | 'parsing'
  | 'creating_list'
  | 'adding_items'
  | 'grabbing_info'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'suspended';

export type BackgroundJobItemStatus = 'pending' | 'running' | 'done' | 'failed' | 'skipped';

export interface WishlistImportJobPayload {
  mode: 'create-list' | 'existing-list';
  listId?: string | null;
  title?: string | null;
  fileName: string;
  format?: string | null;
  content: string;
  contentEncoding: 'text' | 'base64' | 'data-url';
  grabInfo: boolean;
  /** When false, skip AI fallback after deterministic Giftistry parse fails. */
  allowAi?: boolean;
  /**
   * When false, preserve file categories (except uncategorized/general).
   * Default true when omitted (legacy clients).
   */
  optimizeCategories?: boolean;
}

export type ItemEnrichJobPayload =
  | { intent: 'create-from-url'; listId: string; url: string }
  | { intent: 'update-item'; listId: string; url: string; itemId: string; writeBack: true }
  | { intent: 'draft-populate'; listId: string; url: string; writeBack: false };

export type ItemSummarizeJobPayload = {
  listId: string;
  itemId?: string | null;
  writeBack: boolean;
  name: string;
  text?: string | null;
  linkUrl?: string | null;
  websiteName?: string | null;
  price?: number | null;
  category?: string | null;
  priority?: number | null;
  customFields?: {
    Predefined?: Record<string, string | null>;
    UserDefined?: Record<string, string>;
  };
  variations?: { Name: string; Quantity: number }[];
  desiredQuantity?: number | null;
};

export type BackgroundJobPayload =
  | WishlistImportJobPayload
  | ItemEnrichJobPayload
  | ItemSummarizeJobPayload;

export interface BackgroundJob {
  Id: string;
  Kind: BackgroundJobKind;
  ListId: string | null;
  UserId: string;
  Status: BackgroundJobStatus;
  Phase: BackgroundJobPhase;
  ProgressDone: number;
  ProgressTotal: number;
  Message: string;
  Error: string | null;
  Payload: BackgroundJobPayload;
  Result: Record<string, unknown>;
  CreatedAt: Date | string;
  UpdatedAt: Date | string;
  StartedAt: Date | string | null;
  FinishedAt: Date | string | null;
}

export interface BackgroundJobItem {
  Id: string;
  JobId: string;
  ItemId: string | null;
  LinkUrl: string | null;
  Status: BackgroundJobItemStatus;
  Error: string | null;
  Payload: Record<string, unknown>;
  CreatedAt: Date | string;
  UpdatedAt: Date | string;
}

export interface JobItemsSummary {
  Total: number;
  Pending: number;
  Running: number;
  Done: number;
  Failed: number;
  Skipped: number;
}

export interface JobActiveStream {
  Id: string;
  ItemId: string | null;
  Label: string;
  Status: BackgroundJobItemStatus;
  Phase?: GrabPhase | null;
  Detail?: string | null;
  ProgressRate?: { Value: number; Unit: 'tok/s' } | null;
}

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

export function toJobPublicView(
  job: BackgroundJob,
  items?: BackgroundJobItem[] | null
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
    const streamLimit = clampGrabInfoActiveStreamLimit(
      loadConfig().GrabInfoActiveStreamLimit
    );
    const streams = toActiveStreams(items, streamLimit);
    if (streams.length > 0) {
      view.ActiveStreams = streams;
    }
  }

  return view;
}
