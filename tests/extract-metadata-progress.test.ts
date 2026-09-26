import { describe, expect, mock, test } from 'bun:test';

mock.module('../src/common/utils/probe-ai-reachability.util', () => ({
  probeAiReachability: async () => true,
}));

const { ExtractMetadataUseCase } = await import(
  '../src/modules/item/slices/metadata/use-cases/extract-metadata.use-case'
);

describe('ExtractMetadataUseCase progress', () => {
  test('emits scraping then categorizing with tok/s when AI classify runs', async () => {
    const progress: Array<{ phase: string; tokensPerSecond?: number | null }> = [];

    const useCase = new ExtractMetadataUseCase(
      {
        scrape: async () => ({
          data: { title: 'Lamp', category: 'Home', description: null, price: null },
          diagnostics: {
            source: 'fetch',
            confidence: 'high',
            fieldsFound: ['title'],
            aiPopulate: 'skipped',
          },
        }),
      } as never,
      {
        populate: async () => ({
          title: 'Lamp',
          category: 'Home',
          description: 'desc',
          price: null,
        }),
      } as never,
      {
        classify: async (_input: unknown, config: { onDelta?: (d: { tokensPerSecond: number | null }) => Promise<void> }) => {
          await config.onDelta?.({ tokensPerSecond: 28 });
          return { category: 'Home', alternatives: [] };
        },
      } as never,
      { findById: async () => ({ Id: 'u1', AiEnabled: true }) } as never,
      { execute: async () => undefined } as never,
      {} as never,
      { findByListId: async () => [] } as never,
      {
        load: () => ({
          AiEnabled: true,
          AiFastProvider: 'local',
          AiFastEndpoint: 'http://127.0.0.1:11434/v1',
          AiFastModel: 'llama3',
          AiFastApiKey: '',
          AiCategoryPrompt: '',
          AiPopulatePrompt: '',
          AiDescriptionPrompt: '',
        }),
      } as never,
      {
        fetchHtml: async () => '<html></html>',
        resolveWebsiteName: () => 'example.com',
        buildContextFromHtml: () => 'ctx',
        fetchContext: async () => 'ctx',
      } as never
    );

    // High confidence scrape skips populate; still emits scrape + categorize.
    await useCase.execute('https://example.com/lamp', 'user-1', {
      onProgress: async (update) => {
        progress.push(update);
      },
    });

    expect(progress[0]?.phase).toBe('scraping');
    expect(progress.some((p) => p.phase === 'categorizing')).toBe(true);
    expect(progress.some((p) => p.phase === 'categorizing' && p.tokensPerSecond === 28)).toBe(
      true
    );
  });

  test('skips AI phases when AI is disabled', async () => {
    const progress: string[] = [];
    const classify = mock(async () => ({ category: 'Home', alternatives: [] }));

    const useCase = new ExtractMetadataUseCase(
      {
        scrape: async () => ({
          data: { title: 'Lamp', category: 'Home', description: null, price: null },
          diagnostics: {
            source: 'fetch',
            confidence: 'high',
            fieldsFound: ['title'],
            aiPopulate: 'skipped',
          },
        }),
      } as never,
      { populate: async () => ({}) } as never,
      { classify } as never,
      { findById: async () => ({ Id: 'u1', AiEnabled: false }) } as never,
      { execute: async () => undefined } as never,
      {} as never,
      { findByListId: async () => [] } as never,
      {
        load: () => ({
          AiEnabled: false,
          AiFastProvider: 'local',
          AiFastEndpoint: '',
          AiFastModel: '',
          AiFastApiKey: '',
        }),
      } as never,
      {
        fetchHtml: async () => '',
        resolveWebsiteName: () => 'example.com',
        buildContextFromHtml: () => '',
        fetchContext: async () => '',
      } as never
    );

    await useCase.execute('https://example.com/lamp', 'user-1', {
      onProgress: async (update) => {
        progress.push(update.phase);
      },
    });

    expect(progress).toEqual(['scraping']);
    expect(classify).not.toHaveBeenCalled();
  });
});
