import { AppError } from '@/common/domain/errors/app-error';
import {
  fetchWithAiTimeouts,
  resolveAiConnectTimeoutMs,
} from '@/common/utils/ai-fetch.util';
import {
  OPENROUTER_CACHE_TTL_MS,
  OPENROUTER_FETCH_TIMEOUT_MS,
  OPENROUTER_MODELS_URL,
} from '../constants/open-router-models.constant';
import type { SystemModelView } from '../interfaces/system-model-view.interface';
import {
  getOpenRouterModelsCache,
  setOpenRouterModelsCache,
} from '../stores/open-router-models.store';
import { mapOpenRouterCatalogToModels } from './map-system-models.util';

export async function listOpenRouterModels(): Promise<SystemModelView[]> {
  const now = Date.now();
  const cached = getOpenRouterModelsCache();
  if (cached && cached.expiresAt > now) {
    return cached.models;
  }

  let response: Response;
  try {
    response = await fetchWithAiTimeouts(
      OPENROUTER_MODELS_URL,
      {},
      {
        connectTimeoutMs: resolveAiConnectTimeoutMs(),
        completionTimeoutMs: OPENROUTER_FETCH_TIMEOUT_MS,
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    throw new AppError(`Failed to reach OpenRouter models catalog: ${message}`, 502, 'BAD_GATEWAY');
  }

  if (!response.ok) {
    throw new AppError(
      `OpenRouter models catalog returned HTTP ${response.status}`,
      502,
      'BAD_GATEWAY'
    );
  }

  const json = (await response.json()) as { data?: unknown[] };
  const models = mapOpenRouterCatalogToModels(Array.isArray(json.data) ? json.data : []);
  setOpenRouterModelsCache({
    expiresAt: now + OPENROUTER_CACHE_TTL_MS,
    models,
  });
  return models;
}
