export type BackgroundJobKind = 'wishlist-import';

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
}

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
  Payload: WishlistImportJobPayload;
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
}

const ACTIVE_STREAM_LIMIT = 16;

function streamLabel(item: BackgroundJobItem): string {
  const payload = item.Payload || {};
  const name =
    (typeof payload.name === 'string' && payload.name.trim()) ||
    (typeof payload.Name === 'string' && payload.Name.trim()) ||
    '';
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

export function toActiveStreams(items: BackgroundJobItem[]): JobActiveStream[] {
  return items
    .filter((item) => item.Status === 'running')
    .slice(0, ACTIVE_STREAM_LIMIT)
    .map((item) => ({
      Id: item.Id,
      ItemId: item.ItemId,
      Label: streamLabel(item),
      Status: item.Status,
    }));
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
    GrabInfo: !!job.Payload?.grabInfo,
    Mode: job.Payload?.mode,
    FileName: job.Payload?.fileName,
  };

  if (items && items.length > 0) {
    view.ItemsSummary = summarizeJobItems(items);
    const streams = toActiveStreams(items);
    if (streams.length > 0) {
      view.ActiveStreams = streams;
    }
  }

  return view;
}
