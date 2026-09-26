import { AppError } from '@/common/domain/errors/app-error';
import { DOMAIN_ERROR_STATUS } from '@/common/domain/errors/constants/domain-error-status.constant';
import { LOCAL_MODELS_TIMEOUT_MS } from '@/common/utils/constants/probe-ai-reachability.constant';
import {
  fetchWithAiTimeouts,
  resolveAiConnectTimeoutMs,
} from '@/common/utils/ai-fetch.util';
import { buildLocalAiUrl } from '../../../domain/utils/build-local-ai-url.util';
import { normalizeLocalAiEndpoint } from '../../../domain/utils/normalize-local-ai-endpoint.util';

export async function fetchLocalModelIds(
  endpoint: string,
  apiKey?: string | null
): Promise<string[]> {
  const baseEndpoint = normalizeLocalAiEndpoint(endpoint);
  if (!baseEndpoint) {
    throw new AppError(
      'API endpoint URL is required for local AI provider',
      DOMAIN_ERROR_STATUS.BAD_REQUEST,
      'BAD_REQUEST'
    );
  }

  const headers: Record<string, string> = {};
  if (apiKey?.trim()) {
    headers.Authorization = `Bearer ${apiKey.trim()}`;
  }

  try {
    const modelsResponse = await fetchWithAiTimeouts(
      buildLocalAiUrl(baseEndpoint, 'models'),
      { headers },
      {
        connectTimeoutMs: resolveAiConnectTimeoutMs(),
        completionTimeoutMs: LOCAL_MODELS_TIMEOUT_MS,
      }
    );

    if (!modelsResponse.ok) {
      throw new AppError(
        `Cannot reach AI server at ${baseEndpoint} (HTTP ${modelsResponse.status})`,
        DOMAIN_ERROR_STATUS.BAD_REQUEST,
        'BAD_REQUEST'
      );
    }

    const modelsJson = (await modelsResponse.json()) as { data?: Array<{ id?: string }> };
    return (modelsJson.data ?? [])
      .map((entry) => entry.id?.trim())
      .filter((id): id is string => !!id);
  } catch (err) {
    if (err instanceof AppError) throw err;
    const message = err instanceof Error ? err.message : 'Unknown connection error';
    throw new AppError(
      `Cannot reach AI server at ${baseEndpoint}: ${message}`,
      DOMAIN_ERROR_STATUS.BAD_REQUEST,
      'BAD_REQUEST'
    );
  }
}
