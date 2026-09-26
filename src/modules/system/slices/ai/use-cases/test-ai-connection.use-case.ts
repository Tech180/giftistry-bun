import { AppError } from '@/common/domain/errors/app-error';
import { DOMAIN_ERROR_STATUS } from '@/common/domain/errors/constants/domain-error-status.constant';
import { isConnectError } from '@/common/utils/ai-fetch.util';
import { normalizeLocalAiEndpoint } from '../../../domain/utils/normalize-local-ai-endpoint.util';
import type { TestAiConnectionInput } from '../interfaces/test-ai-connection-input.interface';
import type { TestAiConnectionResult } from '../interfaces/test-ai-connection-result.interface';
import { fetchLocalModelIds } from '../utils/fetch-local-model-ids.util';
import { modelMatchesList } from '../utils/model-matches-list.util';
import { verifyOllamaModelMetadata } from '../utils/verify-ollama-model-metadata.util';
import { verifyOpenAiCompatibleCompletion } from '../utils/verify-openai-compatible-completion.util';

export class TestAiConnectionUseCase {
  async execute(input: TestAiConnectionInput): Promise<TestAiConnectionResult> {
    if (input.AiProvider !== 'local') {
      throw new AppError(
        'AI connection test is only supported for local providers',
        DOMAIN_ERROR_STATUS.BAD_REQUEST,
        'BAD_REQUEST'
      );
    }

    const baseEndpoint = normalizeLocalAiEndpoint(input.AiEndpoint);
    if (!baseEndpoint) {
      throw new AppError(
        'API endpoint URL is required for local AI provider',
        DOMAIN_ERROR_STATUS.BAD_REQUEST,
        'BAD_REQUEST'
      );
    }

    const headers: Record<string, string> = {};
    if (input.AiApiKey?.trim()) {
      headers.Authorization = `Bearer ${input.AiApiKey.trim()}`;
    }

    const models = await fetchLocalModelIds(baseEndpoint, input.AiApiKey);

    const modelName = input.AiModel?.trim() || '';
    let modelAvailable: boolean | null = null;

    if (modelName) {
      modelAvailable = models.some((id) => modelMatchesList(modelName, id));
      if (!modelAvailable) {
        throw new AppError(
          `Model "${modelName}" was not found on the local AI server`,
          DOMAIN_ERROR_STATUS.BAD_REQUEST,
          'BAD_REQUEST'
        );
      }
    }

    const targetModel = modelName || models[0];
    if (!targetModel) {
      throw new AppError(
        'Local AI server returned no models',
        DOMAIN_ERROR_STATUS.BAD_REQUEST,
        'BAD_REQUEST'
      );
    }

    const mode = input.Mode === 'reachability' ? 'reachability' : 'full';

    if (mode === 'reachability') {
      const message = modelName
        ? `Connected — model "${modelName}" is available on the server`
        : `Connected — default model "${targetModel}" is available on the server`;

      return {
        Reachable: true,
        ModelAvailable: modelAvailable,
        Working: true,
        Message: message,
        Models: models,
      };
    }

    let verifiedViaOllamaMetadata = false;

    try {
      verifiedViaOllamaMetadata = await verifyOllamaModelMetadata(baseEndpoint, targetModel, headers);
    } catch (err) {
      if (isConnectError(err)) {
        throw err instanceof AppError
          ? err
          : new AppError(
              err instanceof Error ? err.message : 'Cannot reach local AI server',
              DOMAIN_ERROR_STATUS.BAD_REQUEST,
              'BAD_REQUEST'
            );
      }
      verifiedViaOllamaMetadata = false;
    }

    if (!verifiedViaOllamaMetadata) {
      try {
        await verifyOpenAiCompatibleCompletion(baseEndpoint, targetModel, headers);
      } catch (err) {
        if (err instanceof AppError) {
          throw err;
        }
        if (isConnectError(err)) {
          throw new AppError(
            err instanceof Error ? err.message : 'Cannot reach local AI server',
            DOMAIN_ERROR_STATUS.BAD_REQUEST,
            'BAD_REQUEST'
          );
        }
        const message = err instanceof Error ? err.message : 'Unknown completion error';
        throw new AppError(
          `Local AI server is reachable but the model did not respond in time: ${message}. Large models can take a few minutes to load on first use—wait for the model to finish loading and try again.`,
          DOMAIN_ERROR_STATUS.BAD_REQUEST,
          'BAD_REQUEST'
        );
      }
    }

    const message = modelName
      ? verifiedViaOllamaMetadata
        ? `Connected — model "${modelName}" is available on the server`
        : `Connected — model "${modelName}" is available and responding`
      : verifiedViaOllamaMetadata
        ? `Connected — default model "${targetModel}" is available on the server`
        : `Connected — default model "${targetModel}" is responding`;

    return {
      Reachable: true,
      ModelAvailable: modelAvailable,
      Working: true,
      Message: message,
      Models: models,
    };
  }
}
