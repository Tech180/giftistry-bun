import type { ResolvedAiConnection } from './interfaces/resolved-ai-connection.interface';
import {
  LOCAL_MODELS_TIMEOUT_MS,
  OPENROUTER_PROBE_TIMEOUT_MS,
} from './constants/probe-ai-reachability.constant';
import {
  fetchWithAiTimeouts,
  resolveAiConnectTimeoutMs,
} from '@/common/utils/ai-fetch.util';
import { buildLocalAiUrl, normalizeLocalAiEndpoint } from '@/modules/system';

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
