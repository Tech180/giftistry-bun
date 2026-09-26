import type { BackgroundJobRepository } from '../../../domain/ports/background-job.repository';
import type { WishlistImportJobPayload } from '../../../domain/interfaces/wishlist-import-job-payload.interface';
import { mapToJobPublicView } from '../../../application/utils/map-to-job-public-view.util';
import { AppError } from '@/common/domain/errors/app-error';
import { checkRateLimit } from '@/common/middlewares/utils/check-rate-limit.util';
import type { ServerConfigRepository } from '@/modules/system';
import { WISHLIST_IMPORT_RATE_LIMIT } from '../constants/rate-limit.constant';

export class StartWishlistImportJobUseCase {
  constructor(
    private jobRepo: BackgroundJobRepository,
    private serverConfigRepo: ServerConfigRepository
  ) {}

  async execute(
    userId: string,
    payload: WishlistImportJobPayload,
    rateLimitKey: string
  ) {
    checkRateLimit(rateLimitKey, WISHLIST_IMPORT_RATE_LIMIT);

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
        allowAi: payload.allowAi !== false,
        optimizeCategories: payload.optimizeCategories === true,
      },
    });

    return mapToJobPublicView(job, null, this.serverConfigRepo);
  }
}
