import type { ResolvedAiConnection } from '@/common/utils/resolve-ai-connection.util';
import {
  fetchWithAiTimeouts,
  resolveAiConnectTimeoutMs,
} from '@/common/utils/ai-fetch.util';
import { buildLocalAiUrl, normalizeLocalAiEndpoint } from '@/modules/system/domain/normalize-local-ai-endpoint';

export const LOCAL_MODELS_TIMEOUT_MS = 10_000;
export const OPENROUTER_PROBE_TIMEOUT_MS = 15_000;

export async function probeAiReachability(
  connection: ResolvedAiConnection,
  options?: { connectTimeoutMs?: number; listTimeoutMs?: number }
): Promise<boolean> {
  const connectTimeoutMs = resolveAiConnectTimeoutMs(options?.connectTimeoutMs);
  const listTimeoutMs = options?.listTimeoutMs ?? LOCAL_MODELS_TIMEOUT_MS;

  if (connection.provider === 'local') {
    const baseEndpoint = normalizeLocalAiEndpoint(connection.endpoint);
    if (!baseEndpoint) return false;

    const headers: Record<string, string> = {};
    if (connection.apiKey?.trim()) {
      headers.Authorization = `Bearer ${connection.apiKey.trim()}`;
    }

    try {
      const response = await fetchWithAiTimeouts(
        buildLocalAiUrl(baseEndpoint, 'models'),
        { headers },
        {
          connectTimeoutMs,
          completionTimeoutMs: listTimeoutMs,
        }
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  if (connection.provider === 'openrouter') {
    try {
      const response = await fetchWithAiTimeouts(
        'https://openrouter.ai/api/v1/models',
        {},
        {
          connectTimeoutMs,
          completionTimeoutMs: options?.listTimeoutMs ?? OPENROUTER_PROBE_TIMEOUT_MS,
        }
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  return true;
}
