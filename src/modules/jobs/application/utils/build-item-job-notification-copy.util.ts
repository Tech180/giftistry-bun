import type { BackgroundJob } from '../../domain/interfaces/background-job.interface';
import type { BuildItemJobNotificationCopyOptions } from '../interfaces/build-item-job-notification-copy-options.interface';
import type { ItemJobNotificationCopy } from '../interfaces/item-job-notification-copy.interface';

/**
 * Bell/toast copy for item-enrich and item-summarize terminal outcomes.
 * Mirrors frontend format-item-job-notification-summary wording.
 */
export function buildItemJobNotificationCopy(
  job: BackgroundJob,
  options: BuildItemJobNotificationCopyOptions = {}
): ItemJobNotificationCopy {
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

  const listTitle = options.listTitle?.trim() || null;
  const label = resolveItemLabel(job);

  if (isEnrich) {
    if (isAiPopulateFailed(job)) {
      return {
        title: listTitle || 'Item ready',
        message: label
          ? `Product details were found, but AI summarization has failed for “${label}”.`
          : 'Product details were found, but AI summarization has failed.',
      };
    }
    return {
      title: listTitle || 'Item ready',
      message: label
        ? `Finished processing “${label}”.`
        : 'Finished processing your item.',
    };
  }

  return {
    title: listTitle || 'Summary ready',
    message: label
      ? `Notes for “${label}” are ready.`
      : 'Your item summary is ready.',
  };
}

/** True when enrich completed but AI populate soft-failed on Result.Diagnostics. */
export function isAiPopulateFailed(job: Pick<BackgroundJob, 'Result'>): boolean {
  const result = job.Result;
  if (!result || typeof result !== 'object') return false;
  const diagnostics = (result as Record<string, unknown>).Diagnostics;
  if (!diagnostics || typeof diagnostics !== 'object') return false;
  return (diagnostics as Record<string, unknown>).AiPopulate === 'failed';
}

function resolveItemLabel(job: BackgroundJob): string | null {
  const result = job.Result as Record<string, unknown> | null | undefined;
  if (result && typeof result === 'object') {
    const title = result.Title;
    if (typeof title === 'string' && title.trim()) return title.trim();
  }

  const payload = job.Payload as Record<string, unknown> | null | undefined;
  if (payload && typeof payload === 'object') {
    const name = payload.name;
    if (typeof name === 'string' && name.trim()) return name.trim();
  }

  return null;
}
