import { AppError } from '@/common/middlewares/error.middleware';
import {
  buildLocalAiUrl,
  normalizeLocalAiEndpoint,
} from '../domain/normalize-local-ai-endpoint';
import {
  mapLocalModelIdsToModels,
  mapOpenRouterCatalogToModels,
  type SystemModelView,
} from './map-system-models.util';

export type ListSystemModelsProvider = 'openrouter' | 'local';

export interface ListSystemModelsInput {
  Provider: string;
  Endpoint?: string | null;
  ApiKey?: string | null;
}

export interface ListSystemModelsResult {
  Models: SystemModelView[];
}

const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';
const OPENROUTER_FETCH_TIMEOUT_MS = 15_000;
const OPENROUTER_CACHE_TTL_MS = 60 * 60 * 1000;
const LOCAL_MODELS_TIMEOUT_MS = 10_000;

let openRouterCache: { expiresAt: number; models: SystemModelView[] } | null = null;

/** Test helper — clears the in-memory OpenRouter catalog cache. */
export function clearOpenRouterModelsCache(): void {
  openRouterCache = null;
}

async function listOpenRouterModels(): Promise<SystemModelView[]> {
  const now = Date.now();
  if (openRouterCache && openRouterCache.expiresAt > now) {
    return openRouterCache.models;
  }

  let response: Response;
  try {
    response = await fetch(OPENROUTER_MODELS_URL, {
      signal: AbortSignal.timeout(OPENROUTER_FETCH_TIMEOUT_MS),
    });
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
  openRouterCache = {
    expiresAt: now + OPENROUTER_CACHE_TTL_MS,
    models,
  };
  return models;
}

export async function fetchLocalModelIds(
  endpoint: string,
  apiKey?: string | null
): Promise<string[]> {
  const baseEndpoint = normalizeLocalAiEndpoint(endpoint);
  if (!baseEndpoint) {
    throw new AppError('API endpoint URL is required for local AI provider', 400, 'BAD_REQUEST');
  }

  const headers: Record<string, string> = {};
  if (apiKey?.trim()) {
    headers.Authorization = `Bearer ${apiKey.trim()}`;
  }

  try {
    const modelsResponse = await fetch(buildLocalAiUrl(baseEndpoint, 'models'), {
      headers,
      signal: AbortSignal.timeout(LOCAL_MODELS_TIMEOUT_MS),
    });

    if (!modelsResponse.ok) {
      throw new AppError(
        `Cannot reach AI server at ${baseEndpoint} (HTTP ${modelsResponse.status})`,
        400,
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
    throw new AppError(`Cannot reach AI server at ${baseEndpoint}: ${message}`, 400, 'BAD_REQUEST');
  }
}

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

    throw new AppError('Provider must be openrouter or local', 400, 'BAD_REQUEST');
  }
}
