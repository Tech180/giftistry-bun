import type { ServerConfigRepository } from '../../../domain/ports/server-config.repository';
import {
  catalogForConfig,
  sanitizeEnabledPackIdsForConfig,
} from '../../../domain/packs';
import type { MetadataPacksResult } from '../interfaces/metadata-packs-result.interface';
import { toMetadataPackView } from '../utils/to-metadata-pack-view.util';

export class GetMetadataPacksUseCase {
  constructor(private serverConfigRepo: ServerConfigRepository) {}

  execute(): MetadataPacksResult {
    const config = this.serverConfigRepo.load();
    const catalog = catalogForConfig(config);
    return {
      Catalog: catalog.map(toMetadataPackView),
      EnabledPackIds: sanitizeEnabledPackIdsForConfig(config),
    };
  }
}
