import { getEnv } from '@/common/config/utils/get-env.util';
import type { ServerConfigRepository } from '@/modules/system/domain/ports/server-config.repository';
import type { GiphyApiKeyProvider } from '../../domain/ports/giphy-api-key-provider.port';

export class ConfigGiphyApiKeyProvider implements GiphyApiKeyProvider {
  constructor(private serverConfigRepo: ServerConfigRepository) {}

  getApiKey(): string | null {
    const fromConfig = this.serverConfigRepo.load().GiphyApiKey?.trim();
    if (fromConfig) {
      return fromConfig;
    }
    const fromEnv = getEnv().GIFTISTRY_GIPHY_API_KEY?.trim();
    return fromEnv || null;
  }
}
