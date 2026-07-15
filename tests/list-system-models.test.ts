import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import {
  mapLocalModelIdsToModels,
  mapOpenRouterCatalogToModels,
} from '@/modules/system/application/map-system-models.util';
import {
  clearOpenRouterModelsCache,
  ListSystemModelsUseCase,
} from '@/modules/system/application/list-system-models.use-case';

describe('mapOpenRouterCatalogToModels', () => {
  test('maps colon-split company and drops image-output models', () => {
    const models = mapOpenRouterCatalogToModels([
      {
        id: 'google/gemini-2.0-flash',
        name: 'Google: Gemini 2.0 Flash',
        architecture: { output_modalities: ['text'] },
      },
      {
        id: 'black-forest-labs/flux',
        name: 'Black Forest Labs: FLUX',
        architecture: { output_modalities: ['image'] },
      },
      {
        id: 'acme/image-gen',
        name: 'Acme: Image Gen',
        architecture: { modality: 'text+image->image' },
      },
      {
        id: 'plain-model',
        name: 'Plain Model',
      },
    ]);

    expect(models.map((m) => m.Id)).toEqual(['google/gemini-2.0-flash', 'plain-model']);
    expect(models[0]).toEqual({
      Id: 'google/gemini-2.0-flash',
      Name: 'Google: Gemini 2.0 Flash',
      Company: 'Google',
      DisplayName: 'Gemini 2.0 Flash',
    });
    expect(models[1]).toEqual({
      Id: 'plain-model',
      Name: 'Plain Model',
      Company: 'Other',
      DisplayName: 'Plain Model',
    });
  });

  test('sorts by display name', () => {
    const models = mapOpenRouterCatalogToModels([
      { id: 'b/model', name: 'Beta: Zebra' },
      { id: 'a/model', name: 'Alpha: Apple' },
    ]);
    expect(models.map((m) => m.DisplayName)).toEqual(['Apple', 'Zebra']);
  });
});

describe('mapLocalModelIdsToModels', () => {
  test('maps ids with Company Local', () => {
    expect(mapLocalModelIdsToModels([' llama3 ', '', 'qwen3:8b'])).toEqual([
      { Id: 'llama3', Name: 'llama3', Company: 'Local', DisplayName: 'llama3' },
      { Id: 'qwen3:8b', Name: 'qwen3:8b', Company: 'Local', DisplayName: 'qwen3:8b' },
    ]);
  });
});

describe('ListSystemModelsUseCase', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    clearOpenRouterModelsCache();
    globalThis.fetch = originalFetch;
  });

  afterEach(() => {
    clearOpenRouterModelsCache();
    globalThis.fetch = originalFetch;
  });

  test('rejects unknown provider', async () => {
    const useCase = new ListSystemModelsUseCase();
    await expect(useCase.execute({ Provider: 'openai' })).rejects.toThrow(
      'Provider must be openrouter or local'
    );
  });

  test('caches OpenRouter catalog for one hour', async () => {
    let fetchCount = 0;
    globalThis.fetch = (async () => {
      fetchCount += 1;
      return new Response(
        JSON.stringify({
          data: [{ id: 'google/gemini', name: 'Google: Gemini' }],
        }),
        { status: 200 }
      );
    }) as typeof fetch;

    const useCase = new ListSystemModelsUseCase();
    const first = await useCase.execute({ Provider: 'openrouter' });
    const second = await useCase.execute({ Provider: 'openrouter' });

    expect(fetchCount).toBe(1);
    expect(first.Models).toEqual(second.Models);
    expect(first.Models[0]?.Company).toBe('Google');
  });

  test('lists local models from endpoint', async () => {
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/models')) {
        return new Response(
          JSON.stringify({ data: [{ id: 'llama3' }, { id: 'mistral' }] }),
          { status: 200 }
        );
      }
      return new Response('not found', { status: 404 });
    }) as typeof fetch;

    const useCase = new ListSystemModelsUseCase();
    const result = await useCase.execute({
      Provider: 'local',
      Endpoint: 'http://localhost:11434/v1',
    });

    expect(result.Models).toEqual([
      { Id: 'llama3', Name: 'llama3', Company: 'Local', DisplayName: 'llama3' },
      { Id: 'mistral', Name: 'mistral', Company: 'Local', DisplayName: 'mistral' },
    ]);
  });

  test('requires endpoint for local provider', async () => {
    const useCase = new ListSystemModelsUseCase();
    await expect(useCase.execute({ Provider: 'local' })).rejects.toThrow(
      'API endpoint URL is required for local AI provider'
    );
  });
});
