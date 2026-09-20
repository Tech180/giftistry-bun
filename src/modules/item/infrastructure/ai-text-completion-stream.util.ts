import { computeTokensPerSecond } from '@/common/domain/compute-tokens-per-second.util';

export { computeTokensPerSecond };

/** Approximate token count from streamed text until provider usage arrives. */
export function estimateTokensFromText(text: string): number {
  if (!text) {
    return 0;
  }

  return Math.max(1, Math.ceil(text.length / 4));
}

export function createThrottledDeltaEmitter(
  onDelta: ((delta: { text: string; tokensPerSecond: number | null }) => void | Promise<void>) | undefined,
  intervalMs = 1000
): (text: string, tokensPerSecond: number | null, force?: boolean) => Promise<void> {
  let lastEmitAt = 0;
  return async (text, tokensPerSecond, force = false) => {
    if (!onDelta) return;
    const now = Date.now();
    if (!force && lastEmitAt > 0 && now - lastEmitAt < intervalMs) return;
    lastEmitAt = now;
    await onDelta({ text, tokensPerSecond });
  };
}

/** Extract text delta from an OpenAI-compatible chat.completion.chunk JSON object. */
export function extractOpenAiStreamDelta(payload: unknown): {
  content: string;
  completionTokens?: number;
  promptTokens?: number;
} {
  if (!payload || typeof payload !== 'object') return { content: '' };
  const record = payload as {
    choices?: Array<{ delta?: { content?: string | null } }>;
    usage?: { completion_tokens?: number; prompt_tokens?: number };
  };
  const content = record.choices?.[0]?.delta?.content ?? '';
  const result: {
    content: string;
    completionTokens?: number;
    promptTokens?: number;
  } = { content: typeof content === 'string' ? content : '' };
  if (typeof record.usage?.completion_tokens === 'number') {
    result.completionTokens = record.usage.completion_tokens;
  }
  if (typeof record.usage?.prompt_tokens === 'number') {
    result.promptTokens = record.usage.prompt_tokens;
  }
  return result;
}

/** Extract text from an Anthropic SSE JSON event payload. */
export function extractAnthropicStreamDelta(payload: unknown): {
  content: string;
  completionTokens?: number;
  promptTokens?: number;
  done?: boolean;
} {
  if (!payload || typeof payload !== 'object') return { content: '' };
  const record = payload as {
    type?: string;
    delta?: { type?: string; text?: string };
    usage?: { output_tokens?: number; input_tokens?: number };
    message?: { usage?: { output_tokens?: number; input_tokens?: number } };
  };

  if (record.type === 'content_block_delta' && record.delta?.type === 'text_delta') {
    return { content: record.delta.text || '' };
  }

  if (record.type === 'message_delta') {
    const out: {
      content: string;
      completionTokens?: number;
      promptTokens?: number;
    } = { content: '' };
    if (typeof record.usage?.output_tokens === 'number') {
      out.completionTokens = record.usage.output_tokens;
    }
    return out;
  }

  if (record.type === 'message_start' && record.message?.usage) {
    const out: {
      content: string;
      completionTokens?: number;
      promptTokens?: number;
    } = { content: '' };
    if (typeof record.message.usage.input_tokens === 'number') {
      out.promptTokens = record.message.usage.input_tokens;
    }
    return out;
  }

  if (record.type === 'message_stop') {
    return { content: '', done: true };
  }

  return { content: '' };
}

/** Extract text from a Gemini streamGenerateContent JSON chunk. */
export function extractGeminiStreamDelta(payload: unknown): {
  content: string;
  completionTokens?: number;
  promptTokens?: number;
} {
  if (!payload || typeof payload !== 'object') return { content: '' };
  const record = payload as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    usageMetadata?: {
      candidatesTokenCount?: number;
      promptTokenCount?: number;
    };
  };
  const parts = record.candidates?.[0]?.content?.parts ?? [];
  const content = parts.map((part) => part.text || '').join('');
  const out: {
    content: string;
    completionTokens?: number;
    promptTokens?: number;
  } = { content };
  if (typeof record.usageMetadata?.candidatesTokenCount === 'number') {
    out.completionTokens = record.usageMetadata.candidatesTokenCount;
  }
  if (typeof record.usageMetadata?.promptTokenCount === 'number') {
    out.promptTokens = record.usageMetadata.promptTokenCount;
  }
  return out;
}

/**
 * Parse an SSE buffer into complete events and leftover incomplete data.
 * Handles both `data:`-only and `event:`+`data:` frames.
 */
export function consumeSseBuffer(buffer: string): {
  events: Array<{ event: string | null; data: string }>;
  rest: string;
} {
  const normalized = buffer.replace(/\r\n/g, '\n');
  const parts = normalized.split('\n\n');
  const rest = parts.pop() ?? '';
  const events: Array<{ event: string | null; data: string }> = [];

  for (const part of parts) {
    if (!part.trim()) continue;
    let event: string | null = null;
    const dataLines: string[] = [];
    for (const line of part.split('\n')) {
      if (line.startsWith('event:')) {
        event = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trimStart());
      }
    }
    if (dataLines.length > 0) {
      events.push({ event, data: dataLines.join('\n') });
    }
  }

  return { events, rest };
}
