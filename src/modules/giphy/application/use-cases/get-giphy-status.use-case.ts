import { AppError } from '@/common/domain/errors/app-error';
import type { GiphyApiKeyProvider } from '../../domain/ports/giphy-api-key-provider.port';

export class GetGiphyStatusUseCase {
  constructor(private giphyApiKeyProvider: GiphyApiKeyProvider) {}

  execute(userId: string): { configured: boolean } {
    if (!userId) {
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    return {
      configured: Boolean(this.giphyApiKeyProvider.getApiKey()),
    };
  }
}
