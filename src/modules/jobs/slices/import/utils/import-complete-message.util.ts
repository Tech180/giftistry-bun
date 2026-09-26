import type { BackgroundJobItem } from '../../../domain/interfaces/background-job-item.interface';

export function jobItemNeedsGrab(item: BackgroundJobItem): boolean {
  const hasLink = !!(
    item.LinkUrl?.trim() || String(item.Payload?.linkUrl ?? '').trim()
  );
  return (
    hasLink &&
    (item.Status === 'pending' || item.Status === 'failed' || item.Status === 'running')
  );
}

/** Freshly added items waiting for first grab (post add-items phase). */
export function jobItemPendingGrab(item: BackgroundJobItem): boolean {
  return (
    item.Status === 'pending' &&
    !!(item.LinkUrl?.trim() || String(item.Payload?.linkUrl ?? '').trim())
  );
}

export function formatImportGrabCompleteMessage(
  created: number,
  grabFailed: number
): string {
  if (grabFailed > 0) {
    return `Import finished — ${created} item${created === 1 ? '' : 's'} added, ${grabFailed} grab failure${grabFailed === 1 ? '' : 's'}`;
  }
  return `Import finished — ${created} item${created === 1 ? '' : 's'} added`;
}
