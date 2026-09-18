import type { BackgroundJob } from '../domain/background-job.entity';
import type { CreateNotificationUseCase } from '@/modules/notifications/application/create-notification.use-case';
import type { WishlistRepository } from '@/modules/wishlist/domain/ports/wishlist.repository';
import { isUserPresentOnList } from '@/modules/wishlist/infrastructure/wishlist-ws-registry';
import {
  buildItemJobNotificationCopy,
  isAiPopulateFailed,
} from './build-item-job-notification-copy.util';

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
    private wishlistRepo: WishlistRepository,
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

    let listTitle: string | null = null;
    try {
      const wishlist = await this.wishlistRepo.findById(job.ListId);
      listTitle = wishlist?.Title?.trim() || null;
    } catch {
      listTitle = null;
    }

    const copy = buildItemJobNotificationCopy(job, { listTitle });
    const type = job.Status === 'failed' ? 'job_failed' : 'job_completed';
    const metadata: Record<string, unknown> = {
      ListId: job.ListId,
      JobId: job.Id,
      JobKind: job.Kind,
    };
    if (listTitle) {
      metadata.ListTitle = listTitle;
    }
    const itemId = readResultItemId(job);
    if (itemId) {
      metadata.ItemId = itemId;
    }
    if (
      job.Kind === 'item-enrich' &&
      job.Status === 'completed' &&
      isAiPopulateFailed(job)
    ) {
      metadata.SoftFailure = true;
      metadata.AiPopulate = 'failed';
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
