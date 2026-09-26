import type { BackgroundJob } from '../../domain/interfaces/background-job.interface';
import type { CreateNotificationUseCase } from '@/modules/notifications';
import type { WishlistRepository } from '@/modules/wishlist';
import type { WishlistPresencePort } from '@/modules/wishlist';
import { ITEM_JOB_KINDS } from '../constants/item-job-kinds.constant';
import {
  buildItemJobNotificationCopy,
  isAiPopulateFailed,
} from '../utils/build-item-job-notification-copy.util';
import { readJobResultItemId } from '../utils/read-job-result-item-id.util';

/**
 * Creates a bell notification when an item AI job finishes and the creator
 * is not currently viewing that wishlist page.
 */
export class NotifyItemJobCompletionUseCase {
  constructor(
    private createNotification: CreateNotificationUseCase,
    private wishlistRepo: WishlistRepository,
    private presence: WishlistPresencePort
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
    const itemId = readJobResultItemId(job);
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
