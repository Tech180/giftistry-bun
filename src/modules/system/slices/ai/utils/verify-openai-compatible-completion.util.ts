import { AppError } from '@/common/domain/errors/app-error';
import { DOMAIN_ERROR_STATUS } from '@/common/domain/errors/constants/domain-error-status.constant';
import {
  fetchWithAiTimeouts,
  resolveAiConnectTimeoutMs,
} from '@/common/utils/ai-fetch.util';
import { buildLocalAiUrl } from '../../../domain/utils/build-local-ai-url.util';
import { COMPLETION_TIMEOUT_MS } from '../constants/test-ai-connection-timeout.constant';

export async function verifyOpenAiCompatibleCompletion(
  baseEndpoint: string,
  targetModel: string,
  headers: Record<string, string>
): Promise<void> {
  const chatResponse = await fetchWithAiTimeouts(
    buildLocalAiUrl(baseEndpoint, 'chat/completions'),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({
        model: targetModel,
        messages: [{ role: 'user', content: 'Reply with OK.' }],
        max_tokens: 16,
      }),
    },
    {
      connectTimeoutMs: resolveAiConnectTimeoutMs(),
      completionTimeoutMs: COMPLETION_TIMEOUT_MS,
    }
  );

  if (!chatResponse.ok) {
    const errorText = await chatResponse.text();
    throw new AppError(
      `Local AI server failed completion test (HTTP ${chatResponse.status}): ${errorText}`,
      DOMAIN_ERROR_STATUS.BAD_REQUEST,
      'BAD_REQUEST'
    );
  }
}
