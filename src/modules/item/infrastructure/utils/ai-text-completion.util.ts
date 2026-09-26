import { computeTokensPerSecond } from '@/common/domain/utils/compute-tokens-per-second.util';
import {
  fetchWithAiTimeouts,
  resolveAiConnectTimeoutMs,
} from '@/common/utils/ai-fetch.util';
import { buildLocalAiUrl, normalizeLocalAiEndpoint } from '@/modules/system';
import {
  LOCAL_AI_DEFAULT_MODEL,
  OPENROUTER_CHAT_COMPLETIONS_URL,
  OPENROUTER_DEFAULT_MODEL,
  OPENROUTER_EXTRA_HEADERS,
} from '../constants/ai-text-completion.constant';
import type { TextCompletionConfig } from '../interfaces/text-completion-config.interface';
import type { TextCompletionDeltaHandler } from '../interfaces/text-completion-delta-handler.type';
import type { TextCompletionResult } from '../interfaces/text-completion-result.interface';
import type { TextCompletionUsage } from '../interfaces/text-completion-usage.interface';
import {
  consumeSseBuffer,
  createThrottledDeltaEmitter,
  estimateTokensFromText,
  extractOpenAiStreamDelta,
  readResponseTextStream,
} from './ai-text-completion-stream.util';
import { resolveCompletionTimeoutMs } from './resolve-completion-timeout-ms.util';

function buildUsage(
  text: string,
  startedAt: number,
  promptTokens?: number,
  completionTokens?: number
): TextCompletionUsage {
  const elapsedMs = Date.now() - startedAt;
  const tokens =
    completionTokens ?? (text ? estimateTokensFromText(text) : 0);
  const tokensPerSecond = computeTokensPerSecond(tokens, elapsedMs) ?? undefined;
  return {
    promptTokens,
    completionTokens: completionTokens ?? (text ? estimateTokensFromText(text) : undefined),
    tokensPerSecond,
  };
}

function resolveOpenRouterChatUrl(endpoint: string | undefined): string {
  if (!endpoint) return OPENROUTER_CHAT_COMPLETIONS_URL;
  return endpoint.endsWith('/')
    ? `${endpoint}chat/completions`
    : `${endpoint}/chat/completions`;
}

async function streamOpenAiCompatible(
  prompt: string,
  options: {
    url: string;
    apiKey: string;
    model: string;
    headers?: Record<string, string>;
    extraHeaders?: Record<string, string>;
    jsonResponse?: boolean;
    maxTokens?: number;
    timeoutMs: number;
    connectTimeoutMs: number;
    includeUsage?: boolean;
    onDelta?: TextCompletionDeltaHandler;
  }
): Promise<TextCompletionResult> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
    ...(options.headers ?? {}),
    ...(options.extraHeaders ?? {}),
  };
  if (options.apiKey) {
    headers.Authorization = `Bearer ${options.apiKey}`;
  }

  const startedAt = Date.now();
  const emit = createThrottledDeltaEmitter(options.onDelta);
  let text = '';
  let promptTokens: number | undefined;
  let completionTokens: number | undefined;
  let sseBuffer = '';

  const response = await fetchWithAiTimeouts(
    options.url,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: options.model,
        messages: [{ role: 'user', content: prompt }],
        stream: true,
        ...(options.maxTokens != null ? { max_tokens: options.maxTokens } : {}),
        ...(options.includeUsage ? { stream_options: { include_usage: true } } : {}),
        ...(options.jsonResponse ? { response_format: { type: 'json_object' } } : {}),
      }),
    },
    {
      connectTimeoutMs: options.connectTimeoutMs,
      completionTimeoutMs: options.timeoutMs,
    }
  );

  if (!response.ok) {
    throw new Error(`AI API returned status ${response.status}: ${await response.text()}`);
  }

  await readResponseTextStream(response, async (chunk) => {
    sseBuffer += chunk;
    const { events, rest } = consumeSseBuffer(sseBuffer);
    sseBuffer = rest;
    for (const event of events) {
      if (!event.data || event.data === '[DONE]') continue;
      let payload: unknown;
      try {
        payload = JSON.parse(event.data);
      } catch {
        continue;
      }
      const delta = extractOpenAiStreamDelta(payload);
      if (delta.content) {
        text += delta.content;
      }
      if (delta.completionTokens != null) completionTokens = delta.completionTokens;
      if (delta.promptTokens != null) promptTokens = delta.promptTokens;
      const tokenCount = completionTokens ?? estimateTokensFromText(text);
      const tokPerSec = computeTokensPerSecond(tokenCount, Date.now() - startedAt);
      await emit(text, tokPerSec);
    }
  });

  if (!text) {
    throw new Error('Empty response returned from AI API.');
  }

  const usage = buildUsage(text, startedAt, promptTokens, completionTokens);
  await emit(text, usage.tokensPerSecond ?? null, true);
  return { text, usage };
}

export async function completeTextPromptStream(
  prompt: string,
  config: TextCompletionConfig,
  onDelta?: TextCompletionDeltaHandler
): Promise<TextCompletionResult> {
  const { provider, apiKey, model, endpoint, jsonResponse = false, maxTokens } = config;
  const timeoutMs = resolveCompletionTimeoutMs(config.timeoutMs);
  const connectTimeoutMs =
    config.connectTimeoutMs !== undefined
      ? resolveAiConnectTimeoutMs(config.connectTimeoutMs)
      : resolveAiConnectTimeoutMs();

  if (provider === 'openrouter') {
    return streamOpenAiCompatible(prompt, {
      url: resolveOpenRouterChatUrl(endpoint),
      apiKey,
      model: model || OPENROUTER_DEFAULT_MODEL,
      extraHeaders: { ...OPENROUTER_EXTRA_HEADERS },
      jsonResponse,
      maxTokens,
      timeoutMs,
      connectTimeoutMs,
      includeUsage: true,
      onDelta,
    });
  }

  const normalizedEndpoint = normalizeLocalAiEndpoint(endpoint);
  if (!normalizedEndpoint) {
    throw new Error('Local AI endpoint URL is required');
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  return streamOpenAiCompatible(prompt, {
    url: buildLocalAiUrl(normalizedEndpoint, 'chat/completions'),
    apiKey: '',
    model: model || LOCAL_AI_DEFAULT_MODEL,
    headers,
    jsonResponse,
    maxTokens,
    timeoutMs,
    connectTimeoutMs,
    includeUsage: false,
    onDelta,
  });
}

export async function completeTextPrompt(
  prompt: string,
  config: TextCompletionConfig
): Promise<string> {
  const result = await completeTextPromptStream(prompt, config);
  return result.text;
}
