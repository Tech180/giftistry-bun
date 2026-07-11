import { expect, test, describe, beforeEach, afterEach } from 'bun:test';
import { TestAiConnectionUseCase } from '@/modules/system/application/test-ai-connection.use-case';

describe('TestAiConnectionUseCase', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = originalFetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test('rejects non-local providers', async () => {
    const useCase = new TestAiConnectionUseCase();
    await expect(useCase.execute({ aiProvider: 'openrouter' })).rejects.toThrow(
      'AI connection test is only supported for local providers'
    );
  });

  test('requires a local endpoint URL', async () => {
    const useCase = new TestAiConnectionUseCase();
    await expect(useCase.execute({ aiProvider: 'local' })).rejects.toThrow(
      'API endpoint URL is required for local AI provider'
    );
  });

  test('returns success when Ollama model metadata is available', async () => {
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.endsWith('/models') && init?.method !== 'POST') {
        return new Response(JSON.stringify({ data: [{ id: 'qwen3.6:latest' }] }), { status: 200 });
      }

      if (url.endsWith('/api/show')) {
        return new Response(JSON.stringify({ modelfile: 'FROM qwen3.6' }), { status: 200 });
      }

      return new Response('not found', { status: 404 });
    }) as typeof fetch;

    const useCase = new TestAiConnectionUseCase();
    const result = await useCase.execute({
      aiProvider: 'local',
      aiEndpoint: 'http://192.168.100.80:11434',
      aiModel: 'qwen3.6:latest',
    });

    expect(result.reachable).toBe(true);
    expect(result.working).toBe(true);
    expect(result.modelAvailable).toBe(true);
    expect(result.message).toContain('qwen3.6:latest');
  });

  test('falls back to chat completion when Ollama metadata check is unavailable', async () => {
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.endsWith('/models') && init?.method !== 'POST') {
        return new Response(JSON.stringify({ data: [{ id: 'llama3' }] }), { status: 200 });
      }

      if (url.endsWith('/chat/completions')) {
        return new Response(
          JSON.stringify({ choices: [{ message: { content: 'OK' } }] }),
          { status: 200 }
        );
      }

      return new Response('not found', { status: 404 });
    }) as typeof fetch;

    const useCase = new TestAiConnectionUseCase();
    const result = await useCase.execute({
      aiProvider: 'local',
      aiEndpoint: 'http://localhost:11434/v1',
      aiModel: 'llama3',
    });

    expect(result.reachable).toBe(true);
    expect(result.working).toBe(true);
    expect(result.message).toContain('responding');
  });

  test('throws when configured model is missing', async () => {
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      if (String(input).endsWith('/models')) {
        return new Response(JSON.stringify({ data: [{ id: 'qwen3.6:latest' }] }), { status: 200 });
      }
      return new Response('not found', { status: 404 });
    }) as typeof fetch;

    const useCase = new TestAiConnectionUseCase();
    await expect(
      useCase.execute({
        aiProvider: 'local',
        aiEndpoint: 'http://localhost:11434/v1',
        aiModel: 'missing-model',
      })
    ).rejects.toThrow('Model "missing-model" was not found');
  });
});
