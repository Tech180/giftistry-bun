import type { BackgroundJobRepository } from '../domain/ports/background-job.repository';
import type { WishlistImportJobPayload } from '../domain/background-job.entity';
import { toJobPublicView } from '../domain/background-job.entity';
import { AppError } from '@/common/middlewares/error.middleware';
import { checkRateLimit } from '@/common/middlewares/rate-limit.middleware';

export class StartWishlistImportJobUseCase {
  constructor(private jobRepo: BackgroundJobRepository) {}

  async execute(
    userId: string,
    payload: WishlistImportJobPayload,
    rateLimitKey: string
  ) {
    checkRateLimit(rateLimitKey, { windowMs: 60000, max: 5 });

    if (!payload.fileName?.trim()) {
      throw new AppError('File name is required', 400, 'BAD_REQUEST');
    }
    if (!payload.content) {
      throw new AppError('File content is required', 400, 'BAD_REQUEST');
    }
    if (payload.mode === 'existing-list' && !payload.listId) {
      throw new AppError('List ID is required for existing-list import', 400, 'BAD_REQUEST');
    }
    if (payload.mode === 'create-list' && !payload.title?.trim()) {
      throw new AppError('Wishlist title is required', 400, 'BAD_REQUEST');
    }

    const job = await this.jobRepo.create({
      kind: 'wishlist-import',
      userId,
      listId: payload.mode === 'existing-list' ? payload.listId : null,
      payload: {
        ...payload,
        grabInfo: !!payload.grabInfo,
      },
    });

    return toJobPublicView(job);
  }
}
