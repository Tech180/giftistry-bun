import {
  fetchWithAiTimeouts,
  resolveAiConnectTimeoutMs,
} from '@/common/utils/ai-fetch.util';
import { getLocalAiRootUrl } from '../../../domain/utils/get-local-ai-root-url.util';
import { OLLAMA_SHOW_TIMEOUT_MS } from '../constants/test-ai-connection-timeout.constant';

export async function verifyOllamaModelMetadata(
  baseEndpoint: string,
  targetModel: string,
  headers: Record<string, string>
): Promise<boolean> {
  const rootUrl = getLocalAiRootUrl(baseEndpoint);
  const response = await fetchWithAiTimeouts(
    `${rootUrl}/api/show`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({ name: targetModel }),
    },
    {
      connectTimeoutMs: resolveAiConnectTimeoutMs(),
      completionTimeoutMs: OLLAMA_SHOW_TIMEOUT_MS,
    }
  );

  return response.ok;
}
