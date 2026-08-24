import type { BackgroundJob } from '../domain/background-job.entity';

export interface ItemJobNotificationCopy {
  title: string;
  message: string;
}

/**
 * Bell/toast copy for item-enrich and item-summarize terminal outcomes.
 * Mirrors frontend format-item-job-notification-summary wording.
 */
export function buildItemJobNotificationCopy(job: BackgroundJob): ItemJobNotificationCopy {
  const isEnrich = job.Kind === 'item-enrich';
  const failed = job.Status === 'failed';

  if (failed) {
    return {
      title: isEnrich ? 'Auto-fill failed' : 'Summarize failed',
      message:
        job.Error?.trim() ||
        job.Message?.trim() ||
        (isEnrich
          ? 'Failed to fetch product details automatically.'
          : 'Failed to generate notes automatically.'),
    };
  }

  const label = resolveItemLabel(job);
  if (isEnrich) {
    return {
      title: 'Item ready',
      message: label
        ? `Finished processing “${label}”.`
        : 'Finished processing your item.',
    };
  }

  return {
    title: 'Summary ready',
    message: label
      ? `Notes for “${label}” are ready.`
      : 'Your item summary is ready.',
  };
}

function resolveItemLabel(job: BackgroundJob): string | null {
  const payload = job.Payload as Record<string, unknown> | null | undefined;
  if (!payload || typeof payload !== 'object') return null;

  const name = payload.name;
  if (typeof name === 'string' && name.trim()) return name.trim();

  const url = payload.url ?? payload.linkUrl;
  if (typeof url === 'string' && url.trim()) {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return url.trim().slice(0, 48);
    }
  }

  return null;
}
