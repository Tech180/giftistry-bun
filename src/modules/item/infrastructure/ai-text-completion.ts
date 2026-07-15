import { loadConfig } from '@/common/infrastructure/config.loader';
import { buildLocalAiUrl, normalizeLocalAiEndpoint } from '@/modules/system/domain/normalize-local-ai-endpoint';
import {
  clampAiCompletionTimeoutMs,
  DEFAULT_AI_COMPLETION_TIMEOUT_MS,
} from '@/modules/system/domain/server-config.entity';

export { DEFAULT_AI_COMPLETION_TIMEOUT_MS };

export interface TextCompletionConfig {
  provider: string;
  apiKey: string;
  model: string;
  endpoint: string;
  jsonResponse?: boolean;
  /** Override default completion timeout (ms). */
  timeoutMs?: number;
}

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

export function formatAiTimeoutMessage(timeoutMs: number): string {
  const seconds = Math.max(1, Math.round(timeoutMs / 1000));
  if (seconds >= 60) {
    const minutes = Math.round(seconds / 60);
    return `AI request timed out after ${minutes} minute${minutes === 1 ? '' : 's'}. Try a faster model or a smaller file.`;
  }
  return `AI request timed out after ${seconds} second${seconds === 1 ? '' : 's'}. Try a faster model or a smaller file.`;
}

export function isTimeoutError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const error = err as { name?: string; message?: string; code?: string | number };
  if (error.name === 'TimeoutError' || error.name === 'AbortError') return true;
  if (error.code === 23 || error.code === 'ABORT_ERR') return true;
  const message = error.message || '';
  return /timed out|aborted due to timeout/i.test(message);
}

type BunFetchInit = RequestInit & { timeout?: false | number | { connect?: number; idle?: number } };

async function fetchWithAiTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const signal = AbortSignal.timeout(timeoutMs);
  const merged: BunFetchInit = {
    ...init,
    signal,
    // Bun ignores longer AbortSignals unless the built-in ~5m ceiling is disabled.
    timeout: false,
  };

  try {
    return await fetch(url, merged);
  } catch (err) {
    if (isTimeoutError(err)) {
      throw new Error(formatAiTimeoutMessage(timeoutMs));
    }
    throw err;
  }
}

export async function completeTextPrompt(
  prompt: string,
  config: TextCompletionConfig
): Promise<string> {
  const { provider, apiKey, model, endpoint, jsonResponse = false } = config;
  const timeoutMs = resolveCompletionTimeoutMs(config.timeoutMs);

  if (provider === 'openrouter') {
    return completeOpenAiCompatible(prompt, {
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
    });
  }

  if (provider === 'openai') {
    return completeOpenAiCompatible(prompt, {
      url: endpoint
        ? endpoint.endsWith('/')
          ? `${endpoint}chat/completions`
          : `${endpoint}/chat/completions`
        : 'https://api.openai.com/v1/chat/completions',
      apiKey,
      model: model || 'gpt-4o-mini',
      jsonResponse,
      timeoutMs,
    });
  }

  if (provider === 'anthropic') {
    const anthropicUrl = endpoint
      ? endpoint.endsWith('/')
        ? `${endpoint}messages`
        : `${endpoint}/messages`
      : 'https://api.anthropic.com/v1/messages';

    const response = await fetchWithAiTimeout(
      anthropicUrl,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: model || 'claude-3-5-sonnet-20240620',
          max_tokens: 2000,
          messages: [{ role: 'user', content: prompt }],
        }),
      },
      timeoutMs
    );

    if (!response.ok) {
      throw new Error(`Anthropic API returned status ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    const textResponse = data.content?.[0]?.text || '';
    if (!textResponse) {
      throw new Error('Empty response returned from anthropic API.');
    }
    return textResponse;
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

    return completeOpenAiCompatible(prompt, {
      url: buildLocalAiUrl(normalizedEndpoint, 'chat/completions'),
      apiKey: '',
      model: model || 'llama3',
      headers,
      jsonResponse,
      timeoutMs,
    });
  }

  const targetModel = model || 'gemini-1.5-flash';
  let geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`;
  if (endpoint) {
    geminiUrl = endpoint.endsWith('/')
      ? `${endpoint}models/${targetModel}:generateContent?key=${apiKey}`
      : `${endpoint}/models/${targetModel}:generateContent?key=${apiKey}`;
  }

  const response = await fetchWithAiTimeout(
    geminiUrl,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        ...(jsonResponse
          ? { generationConfig: { responseMimeType: 'application/json' } }
          : {}),
      }),
    },
    timeoutMs
  );

  if (!response.ok) {
    throw new Error(`Gemini API returned status ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (!textResponse) {
    throw new Error('Empty response returned from gemini API.');
  }
  return textResponse;
}

async function completeOpenAiCompatible(
  prompt: string,
  options: {
    url: string;
    apiKey: string;
    model: string;
    headers?: Record<string, string>;
    extraHeaders?: Record<string, string>;
    jsonResponse?: boolean;
    timeoutMs: number;
  }
): Promise<string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers ?? {}),
    ...(options.extraHeaders ?? {}),
  };
  if (options.apiKey) {
    headers.Authorization = `Bearer ${options.apiKey}`;
  }

  const response = await fetchWithAiTimeout(
    options.url,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: options.model,
        messages: [{ role: 'user', content: prompt }],
        ...(options.jsonResponse ? { response_format: { type: 'json_object' } } : {}),
      }),
    },
    options.timeoutMs
  );

  if (!response.ok) {
    throw new Error(`AI API returned status ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  const textResponse = data.choices?.[0]?.message?.content || '';
  if (!textResponse) {
    throw new Error('Empty response returned from AI API.');
  }
  return textResponse;
}
