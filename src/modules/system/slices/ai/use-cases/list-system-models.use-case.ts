import { AppError } from '@/common/domain/errors/app-error';
import { DOMAIN_ERROR_STATUS } from '@/common/domain/errors/constants/domain-error-status.constant';
import type { ListSystemModelsInput } from '../interfaces/list-system-models-input.interface';
import type { ListSystemModelsResult } from '../interfaces/list-system-models-result.interface';
import { fetchLocalModelIds } from '../utils/fetch-local-model-ids.util';
import { listOpenRouterModels } from '../utils/list-open-router-models.util';
import { mapLocalModelIdsToModels } from '../utils/map-system-models.util';

export class ListSystemModelsUseCase {
  async execute(input: ListSystemModelsInput): Promise<ListSystemModelsResult> {
    const provider = String(input.Provider ?? '')
      .trim()
      .toLowerCase();

    if (provider === 'openrouter') {
      const models = await listOpenRouterModels();
      return { Models: models };
    }

    if (provider === 'local') {
      const ids = await fetchLocalModelIds(input.Endpoint ?? '', input.ApiKey);
      return { Models: mapLocalModelIdsToModels(ids) };
    }

    throw new AppError(
      'Provider must be openrouter or local',
      DOMAIN_ERROR_STATUS.BAD_REQUEST,
      'BAD_REQUEST'
    );
  }
}
