import type { BackgroundJob } from '../domain/background-job.entity';
import type { CreateNotificationUseCase } from '@/modules/notifications/application/create-notification.use-case';
import { isUserPresentOnList } from '@/modules/wishlist/infrastructure/wishlist-ws-registry';
import { buildItemJobNotificationCopy } from './build-item-job-notification-copy.util';

const ITEM_JOB_KINDS = new Set(['item-enrich', 'item-summarize']);

export type WishlistPresencePort = {
  isUserPresentOnList: (listId: string, userId: string) => boolean;
};

/**
 * Creates a bell notification when an item AI job finishes and the creator
 * is not currently viewing that wishlist page.
 */
export class NotifyItemJobCompletionUseCase {
  constructor(
    private createNotification: CreateNotificationUseCase,
    private presence: WishlistPresencePort = { isUserPresentOnList }
  ) {}

  async execute(job: BackgroundJob): Promise<boolean> {
    if (!ITEM_JOB_KINDS.has(job.Kind)) {
      return false;
    }
    if (job.Status !== 'completed' && job.Status !== 'failed') {
      return false;
    }
    if (!job.ListId || !job.UserId) {
      return false;
    }

    if (this.presence.isUserPresentOnList(job.ListId, job.UserId)) {
      return false;
    }

    const copy = buildItemJobNotificationCopy(job);
    const type = job.Status === 'failed' ? 'job_failed' : 'job_completed';
    const metadata: Record<string, unknown> = {
      ListId: job.ListId,
      JobId: job.Id,
      JobKind: job.Kind,
    };
    const itemId = readResultItemId(job);
    if (itemId) {
      metadata.ItemId = itemId;
    }

    const created = await this.createNotification.execute(
      job.UserId,
      type,
      copy.title,
      copy.message,
      metadata
    );
    return created != null;
  }
}

function readResultItemId(job: BackgroundJob): string | null {
  const result = job.Result;
  if (!result || typeof result !== 'object') return null;
  const itemId = (result as Record<string, unknown>).ItemId;
  return typeof itemId === 'string' && itemId.trim() ? itemId : null;
}
