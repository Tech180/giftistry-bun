import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { probeAiReachability } from '../src/common/utils/probe-ai-reachability.util';

describe('probeAiReachability', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = originalFetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test('returns true for reachable local models endpoint', async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ data: [{ id: 'llama3' }] }), { status: 200 })) as typeof fetch;

    await expect(
      probeAiReachability({
        provider: 'local',
        endpoint: 'http://127.0.0.1:11434',
        apiKey: '',
        model: 'llama3',
      })
    ).resolves.toBe(true);
  });

  test('returns false when local endpoint is unreachable', async () => {
    globalThis.fetch = (async () => {
      throw Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' });
    }) as typeof fetch;

    await expect(
      probeAiReachability({
        provider: 'local',
        endpoint: 'http://127.0.0.1:9',
        apiKey: '',
        model: 'llama3',
      })
    ).resolves.toBe(false);
  });

  test('returns true for non-local non-openrouter providers', async () => {
    await expect(
      probeAiReachability({
        provider: 'openai' as 'local',
        endpoint: '',
        apiKey: 'x',
        model: 'gpt',
      })
    ).resolves.toBe(true);
  });
});
