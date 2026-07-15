import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import {
  DEFAULT_AI_COMPLETION_TIMEOUT_MS,
  formatAiTimeoutMessage,
  isTimeoutError,
  completeTextPrompt,
} from '../src/modules/item/infrastructure/ai-text-completion';

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

  test('passes timeout: false so Bun allows AbortSignals beyond five minutes', async () => {
    let seenInit: RequestInit | undefined;
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      seenInit = init;
      return new Response(JSON.stringify({ choices: [{ message: { content: '{"Items":[]}' } }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;

    await completeTextPrompt('hello', {
      provider: 'local',
      apiKey: '',
      model: 'tiny',
      endpoint: 'http://127.0.0.1:11434/v1',
      jsonResponse: true,
    });

    expect((seenInit as { timeout?: unknown } | undefined)?.timeout).toBe(false);
    expect(seenInit?.signal).toBeDefined();
  });

  test('default timeout constant is above Bun five-minute ceiling', () => {
    expect(DEFAULT_AI_COMPLETION_TIMEOUT_MS).toBeGreaterThan(5 * 60 * 1000);
  });
});
