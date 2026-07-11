import { buildLocalAiUrl, normalizeLocalAiEndpoint } from '@/modules/system/domain/normalize-local-ai-endpoint';

export interface TextCompletionConfig {
  provider: string;
  apiKey: string;
  model: string;
  endpoint: string;
  jsonResponse?: boolean;
}

export async function completeTextPrompt(
  prompt: string,
  config: TextCompletionConfig
): Promise<string> {
  const { provider, apiKey, model, endpoint, jsonResponse = false } = config;

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
    });
  }

  if (provider === 'anthropic') {
    const anthropicUrl = endpoint
      ? endpoint.endsWith('/')
        ? `${endpoint}messages`
        : `${endpoint}/messages`
      : 'https://api.anthropic.com/v1/messages';

    const response = await fetch(anthropicUrl, {
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
    });

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
    });
  }

  const targetModel = model || 'gemini-1.5-flash';
  let geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`;
  if (endpoint) {
    geminiUrl = endpoint.endsWith('/')
      ? `${endpoint}models/${targetModel}:generateContent?key=${apiKey}`
      : `${endpoint}/models/${targetModel}:generateContent?key=${apiKey}`;
  }

  const response = await fetch(geminiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      ...(jsonResponse
        ? { generationConfig: { responseMimeType: 'application/json' } }
        : {}),
    }),
  });

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

  const response = await fetch(options.url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: options.model,
      messages: [{ role: 'user', content: prompt }],
      ...(options.jsonResponse ? { response_format: { type: 'json_object' } } : {}),
    }),
  });

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
