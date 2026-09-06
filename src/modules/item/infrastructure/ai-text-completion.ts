import { loadConfig } from '@/common/infrastructure/config.loader';
import { buildLocalAiUrl, normalizeLocalAiEndpoint } from '@/modules/system/domain/normalize-local-ai-endpoint';
import {
  clampAiCompletionTimeoutMs,
  DEFAULT_AI_COMPLETION_TIMEOUT_MS,
} from '@/modules/system/domain/server-config.entity';
import {
  fetchWithAiTimeouts,
  resolveAiConnectTimeoutMs,
} from '@/common/utils/ai-fetch.util';
import {
  computeTokensPerSecond,
  consumeSseBuffer,
  createThrottledDeltaEmitter,
  estimateTokensFromText,
  extractAnthropicStreamDelta,
  extractGeminiStreamDelta,
  extractOpenAiStreamDelta,
} from './ai-text-completion-stream.util';

export { DEFAULT_AI_COMPLETION_TIMEOUT_MS };
export {
  formatAiTimeoutMessage,
  isTimeoutError,
  resolveAiConnectTimeoutMs,
} from '@/common/utils/ai-fetch.util';
export {
  computeTokensPerSecond,
  estimateTokensFromText,
  extractAnthropicStreamDelta,
  extractGeminiStreamDelta,
  extractOpenAiStreamDelta,
  consumeSseBuffer,
} from './ai-text-completion-stream.util';

export interface TextCompletionConfig {
  provider: string;
  apiKey: string;
  model: string;
  endpoint: string;
  jsonResponse?: boolean;
  /** Override default completion timeout (ms). */
  timeoutMs?: number;
  /** Override default connect timeout (ms). */
  connectTimeoutMs?: number;
}

export interface TextCompletionUsage {
  promptTokens?: number;
  completionTokens?: number;
  tokensPerSecond?: number;
}

export interface TextCompletionDelta {
  text: string;
  tokensPerSecond: number | null;
}

export interface TextCompletionResult {
  text: string;
  usage: TextCompletionUsage;
}

export type TextCompletionDeltaHandler = (
  delta: TextCompletionDelta
) => void | Promise<void>;

export function resolveCompletionTimeoutMs(override?: number): number {
  if (override !== undefined && Number.isFinite(override) && override > 0) {
    return clampAiCompletionTimeoutMs(override);
  }

  try {
    const config = loadConfig();
    if (
      config.AiCompletionTimeoutMs !== undefined &&
      Number.isFinite(config.AiCompletionTimeoutMs)
    ) {
      return clampAiCompletionTimeoutMs(config.AiCompletionTimeoutMs);
    }
  } catch {
    /* config may be unavailable during early boot */
  }

  const fromEnv = Number.parseInt(process.env.AI_COMPLETION_TIMEOUT_MS || '', 10);
  if (Number.isFinite(fromEnv) && fromEnv > 0) {
    return clampAiCompletionTimeoutMs(fromEnv);
  }

  return DEFAULT_AI_COMPLETION_TIMEOUT_MS;
}

async function readResponseTextStream(
  response: Response,
  onChunk: (chunk: string) => Promise<void>
): Promise<void> {
  if (!response.body) {
    const text = await response.text();
    if (text) await onChunk(text);
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    if (chunk) await onChunk(chunk);
  }
  const rest = decoder.decode();
  if (rest) await onChunk(rest);
}

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

export async function completeTextPromptStream(
  prompt: string,
  config: TextCompletionConfig,
  onDelta?: TextCompletionDeltaHandler
): Promise<TextCompletionResult> {
  const { provider, apiKey, model, endpoint, jsonResponse = false } = config;
  const timeoutMs = resolveCompletionTimeoutMs(config.timeoutMs);
  const connectTimeoutMs =
    config.connectTimeoutMs !== undefined
      ? resolveAiConnectTimeoutMs(config.connectTimeoutMs)
      : resolveAiConnectTimeoutMs();

  if (provider === 'openrouter') {
    return streamOpenAiCompatible(prompt, {
      url: endpoint
        ? endpoint.endsWith('/')
          ? `${endpoint}chat/completions`
          : `${endpoint}/chat/completions`
        : 'https://openrouter.ai/api/v1/chat/completions',
      apiKey,
      model: model || 'google/gemini-2.5-flash',
      extraHeaders: {
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Giftistry',
      },
      jsonResponse,
      timeoutMs,
      connectTimeoutMs,
      includeUsage: true,
      onDelta,
    });
  }

  if (provider === 'openai') {
    return streamOpenAiCompatible(prompt, {
      url: endpoint
        ? endpoint.endsWith('/')
          ? `${endpoint}chat/completions`
          : `${endpoint}/chat/completions`
        : 'https://api.openai.com/v1/chat/completions',
      apiKey,
      model: model || 'gpt-4o-mini',
      jsonResponse,
      timeoutMs,
      connectTimeoutMs,
      includeUsage: true,
      onDelta,
    });
  }

  if (provider === 'anthropic') {
    return streamAnthropic(prompt, {
      url: endpoint
        ? endpoint.endsWith('/')
          ? `${endpoint}messages`
          : `${endpoint}/messages`
        : 'https://api.anthropic.com/v1/messages',
      apiKey,
      model: model || 'claude-3-5-sonnet-20240620',
      timeoutMs,
      connectTimeoutMs,
      onDelta,
    });
  }

  if (provider === 'local') {
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
      model: model || 'llama3',
      headers,
      jsonResponse,
      timeoutMs,
      connectTimeoutMs,
      includeUsage: false,
      onDelta,
    });
  }

  return streamGemini(prompt, {
    apiKey,
    model: model || 'gemini-1.5-flash',
    endpoint,
    jsonResponse,
    timeoutMs,
    connectTimeoutMs,
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

async function streamOpenAiCompatible(
  prompt: string,
  options: {
    url: string;
    apiKey: string;
    model: string;
    headers?: Record<string, string>;
    extraHeaders?: Record<string, string>;
    jsonResponse?: boolean;
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

async function streamAnthropic(
  prompt: string,
  options: {
    url: string;
    apiKey: string;
    model: string;
    timeoutMs: number;
    connectTimeoutMs: number;
    onDelta?: TextCompletionDeltaHandler;
  }
): Promise<TextCompletionResult> {
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
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        'x-api-key': options.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: options.model,
        max_tokens: 2000,
        stream: true,
        messages: [{ role: 'user', content: prompt }],
      }),
    },
    {
      connectTimeoutMs: options.connectTimeoutMs,
      completionTimeoutMs: options.timeoutMs,
    }
  );

  if (!response.ok) {
    throw new Error(`Anthropic API returned status ${response.status}: ${await response.text()}`);
  }

  await readResponseTextStream(response, async (chunk) => {
    sseBuffer += chunk;
    const { events, rest } = consumeSseBuffer(sseBuffer);
    sseBuffer = rest;
    for (const event of events) {
      if (!event.data) continue;
      let payload: unknown;
      try {
        payload = JSON.parse(event.data);
      } catch {
        continue;
      }
      const delta = extractAnthropicStreamDelta(payload);
      if (delta.content) text += delta.content;
      if (delta.completionTokens != null) completionTokens = delta.completionTokens;
      if (delta.promptTokens != null) promptTokens = delta.promptTokens;
      const tokenCount = completionTokens ?? estimateTokensFromText(text);
      const tokPerSec = computeTokensPerSecond(tokenCount, Date.now() - startedAt);
      await emit(text, tokPerSec);
    }
  });

  if (!text) {
    throw new Error('Empty response returned from anthropic API.');
  }

  const usage = buildUsage(text, startedAt, promptTokens, completionTokens);
  await emit(text, usage.tokensPerSecond ?? null, true);
  return { text, usage };
}

async function streamGemini(
  prompt: string,
  options: {
    apiKey: string;
    model: string;
    endpoint: string;
    jsonResponse?: boolean;
    timeoutMs: number;
    connectTimeoutMs: number;
    onDelta?: TextCompletionDeltaHandler;
  }
): Promise<TextCompletionResult> {
  const targetModel = options.model;
  let geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:streamGenerateContent?alt=sse&key=${options.apiKey}`;
  if (options.endpoint) {
    const base = options.endpoint.endsWith('/')
      ? options.endpoint
      : `${options.endpoint}/`;
    geminiUrl = `${base}models/${targetModel}:streamGenerateContent?alt=sse&key=${options.apiKey}`;
  }

  const startedAt = Date.now();
  const emit = createThrottledDeltaEmitter(options.onDelta);
  let text = '';
  let promptTokens: number | undefined;
  let completionTokens: number | undefined;
  let sseBuffer = '';

  const response = await fetchWithAiTimeouts(
    geminiUrl,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        ...(options.jsonResponse
          ? { generationConfig: { responseMimeType: 'application/json' } }
          : {}),
      }),
    },
    {
      connectTimeoutMs: options.connectTimeoutMs,
      completionTimeoutMs: options.timeoutMs,
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API returned status ${response.status}: ${await response.text()}`);
  }

  await readResponseTextStream(response, async (chunk) => {
    sseBuffer += chunk;
    const { events, rest } = consumeSseBuffer(sseBuffer);
    sseBuffer = rest;
    for (const event of events) {
      if (!event.data) continue;
      let payload: unknown;
      try {
        payload = JSON.parse(event.data);
      } catch {
        continue;
      }
      const delta = extractGeminiStreamDelta(payload);
      if (delta.content) text += delta.content;
      if (delta.completionTokens != null) completionTokens = delta.completionTokens;
      if (delta.promptTokens != null) promptTokens = delta.promptTokens;
      const tokenCount = completionTokens ?? estimateTokensFromText(text);
      const tokPerSec = computeTokensPerSecond(tokenCount, Date.now() - startedAt);
      await emit(text, tokPerSec);
    }
  });

  if (!text) {
    throw new Error('Empty response returned from gemini API.');
  }

  const usage = buildUsage(text, startedAt, promptTokens, completionTokens);
  await emit(text, usage.tokensPerSecond ?? null, true);
  return { text, usage };
}
