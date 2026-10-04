import { AppError } from '@/common/domain/errors/app-error';
import { checkRateLimit } from '@/common/middlewares/utils/check-rate-limit.util';
import type { AssertUserCanUseCase } from '@/common/application/use-cases/user-policy.use-cases';
import type { GiphyApiKeyProvider } from '../../domain/ports/giphy-api-key-provider.port';
import type { GiphyCatalog } from '../../domain/ports/giphy-catalog.port';
import type { GifSearchResult } from '../../domain/interfaces/gif-search-result.interface';
import {
  DEFAULT_GIF_SEARCH_LIMIT,
  MAX_GIF_SEARCH_LIMIT,
} from '../../domain/constants/gif-search-limit.constant';

const SEARCH_RATE_LIMIT = { windowMs: 60_000, max: 30 };

export class SearchGifsUseCase {
  constructor(
    private giphyApiKeyProvider: GiphyApiKeyProvider,
    private giphyCatalog: GiphyCatalog,
    private assertUserCan: AssertUserCanUseCase
  ) {}

  async execute(userId: string, query: string, limit?: number): Promise<GifSearchResult[]> {
    if (!userId) {
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    await this.assertUserCan.execute(userId, 'CanUseComments');
    checkRateLimit(`giphy:search:${userId}`, SEARCH_RATE_LIMIT);

    const apiKey = this.giphyApiKeyProvider.getApiKey();
    if (!apiKey) {
      throw new AppError(
        'GIF search is not configured on this server. Ask the owner to set a GIPHY API key in Server settings.',
        503,
        'GIPHY_NOT_CONFIGURED'
      );
    }

    const resolvedLimit = Math.min(
      Math.max(limit ?? DEFAULT_GIF_SEARCH_LIMIT, 1),
      MAX_GIF_SEARCH_LIMIT
    );

    return this.giphyCatalog.search(apiKey, query, resolvedLimit);
  }
}
