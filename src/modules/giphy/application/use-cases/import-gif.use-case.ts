import { AppError } from '@/common/domain/errors/app-error';
import { checkRateLimit } from '@/common/middlewares/utils/check-rate-limit.util';
import type { AssertUserCanUseCase } from '@/common/application/use-cases/user-policy.use-cases';
import type { GiphyCdnImageFetcher } from '../../domain/ports/giphy-cdn-image-fetcher.port';

const IMPORT_RATE_LIMIT = { windowMs: 60_000, max: 20 };

export class ImportGifUseCase {
  constructor(
    private giphyCdnImageFetcher: GiphyCdnImageFetcher,
    private assertUserCan: AssertUserCanUseCase
  ) {}

  async execute(userId: string, imageUrl: string): Promise<{ dataUrl: string }> {
    if (!userId) {
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    await this.assertUserCan.execute(userId, 'CanUseComments');
    await this.assertUserCan.execute(userId, 'CanUploadImages');
    checkRateLimit(`giphy:import:${userId}`, IMPORT_RATE_LIMIT);

    const trimmed = imageUrl?.trim();
    if (!trimmed) {
      throw new AppError('Image URL is required', 400, 'BAD_REQUEST');
    }

    const dataUrl = await this.giphyCdnImageFetcher.fetchAsDataUrl(trimmed);
    if (!dataUrl) {
      throw new AppError(
        'Invalid or unsupported GIF URL. Only GIPHY CDN links are allowed.',
        400,
        'BAD_REQUEST'
      );
    }

    return { dataUrl };
  }
}
