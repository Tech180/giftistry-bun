import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { DEFAULT_AI_COMPLETION_TIMEOUT_MS } from '../src/modules/system';
import {
  formatAiTimeoutMessage,
  formatAiConnectErrorMessage,
  isTimeoutError,
} from '../src/common/utils/ai-fetch.util';
import { completeTextPrompt } from '../src/modules/item/infrastructure/utils/ai-text-completion.util';

describe('formatAiTimeoutMessage', () => {
  test('formats minutes for long timeouts', () => {
    expect(formatAiTimeoutMessage(10 * 60 * 1000)).toContain('10 minute');
    expect(formatAiTimeoutMessage(60_000)).toContain('1 minute');
  });

  test('formats seconds for short timeouts', () => {
    expect(formatAiTimeoutMessage(45_000)).toContain('45 second');
  });
});

describe('isTimeoutError', () => {
  test('detects TimeoutError and timed out messages', () => {
    expect(isTimeoutError(Object.assign(new Error('The operation timed out.'), { name: 'TimeoutError' }))).toBe(
      true
    );
    expect(isTimeoutError(new Error('aborted due to timeout'))).toBe(true);
    expect(isTimeoutError(new Error('network down'))).toBe(false);
  });
});

describe('completeTextPrompt timeout handling', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = originalFetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test('rewrites Bun timeout errors into a clear AI timeout message', async () => {
    globalThis.fetch = (async () => {
      const err = new Error('The operation timed out.');
      err.name = 'TimeoutError';
      throw err;
    }) as typeof fetch;

    await expect(
      completeTextPrompt('hello', {
        provider: 'local',
        apiKey: '',
        model: 'tiny',
        endpoint: 'http://127.0.0.1:11434/v1',
        timeoutMs: 45_000,
      })
    ).rejects.toThrow(formatAiTimeoutMessage(45_000));
  });

  test('rewrites connect errors into a clear AI connect message', async () => {
    globalThis.fetch = (async () => {
      const err = Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' });
      throw err;
    }) as typeof fetch;

    await expect(
      completeTextPrompt('hello', {
        provider: 'local',
        apiKey: '',
        model: 'tiny',
        endpoint: 'http://127.0.0.1:11434/v1',
        connectTimeoutMs: 5_000,
      })
    ).rejects.toThrow(formatAiConnectErrorMessage(5_000));
  });

  test('aborts with connect error when headers are not received in time', async () => {
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      await new Promise<void>((_resolve, reject) => {
        const signal = init?.signal;
        if (!signal) {
          reject(new Error('missing signal'));
          return;
        }
        if (signal.aborted) {
          reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
          return;
        }
        signal.addEventListener(
          'abort',
          () => reject(Object.assign(new Error('The operation was aborted.'), { name: 'AbortError' })),
          { once: true }
        );
      });
      return new Response('unreachable');
    }) as typeof fetch;

    await expect(
      completeTextPrompt('hello', {
        provider: 'local',
        apiKey: '',
        model: 'tiny',
        endpoint: 'http://127.0.0.1:11434/v1',
        connectTimeoutMs: 50,
        timeoutMs: 30_000,
      })
    ).rejects.toThrow(formatAiConnectErrorMessage(50));
  });

  test('passes timeout: false so Bun allows long streaming completions', async () => {
    let seenInit: RequestInit | undefined;
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      seenInit = init;
      const encoder = new TextEncoder();
      const payload =
        'data: {"choices":[{"delta":{"content":"ok"}}]}\n\ndata: [DONE]\n\n';
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(payload));
          controller.close();
        },
      });
      return new Response(stream, {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      });
    }) as typeof fetch;

    const text = await completeTextPrompt('hello', {
      provider: 'local',
      apiKey: '',
      model: 'tiny',
      endpoint: 'http://127.0.0.1:11434/v1',
      jsonResponse: true,
      connectTimeoutMs: 3_000,
    });

    expect(text).toBe('ok');
    expect((seenInit as { timeout?: unknown } | undefined)?.timeout).toBe(false);
    expect(seenInit?.signal).toBeDefined();
  });

  test('default timeout constant is above Bun five-minute ceiling', () => {
    expect(DEFAULT_AI_COMPLETION_TIMEOUT_MS).toBeGreaterThan(5 * 60 * 1000);
  });
});
