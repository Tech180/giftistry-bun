import { describe, expect, mock, test } from 'bun:test';
import { noopScrapeTelemetry } from '../src/modules/item/infrastructure/adapters/log-scrape-telemetry';

mock.module('../src/common/utils/probe-ai-reachability.util', () => ({
  probeAiReachability: async () => true,
}));

const { ExtractMetadataUseCase } = await import(
  '../src/modules/item/slices/metadata/use-cases/extract-metadata.use-case'
);
const { ScrapeError } = await import('../src/modules/item');

const aiConfig = {
  AiEnabled: true,
  AiFastProvider: 'local',
  AiFastEndpoint: 'http://127.0.0.1:11434/v1',
  AiFastModel: 'llama3',
  AiFastApiKey: '',
  AiCategoryPrompt: '',
  AiPopulatePrompt: '',
  AiDescriptionPrompt: '',
  AiWebSearchEnabled: false,
};

const aiConfigWithSearch = {
  ...aiConfig,
  AiWebSearchEnabled: true,
};

describe('ExtractMetadataUseCase blocked scrape fallback', () => {
  test('completes via AI when scrape is blocked and search corroborates title', async () => {
    const fetchHtml = mock(async () => '<html>should not fetch</html>');
    const fetchContext = mock(async () => 'should not fetch context');
    const research = mock(async () =>
      [
        'Fosi Audio DAC USB amplifier specs',
        'Compact USB DAC amp for desktop headphones',
      ].join('\n')
    );

    const useCase = new ExtractMetadataUseCase(
      {
        resolveFinalUrl: async () => null,
        scrapeFromCapture: async () => {
          throw new Error('scrapeFromCapture not implemented in mock');
        },
        scrape: async () => {
          throw new ScrapeError('Both strategies failed: bot-check:captcha', {
            blocked: true,
            validationReason: 'bot-check:captcha',
            finalUrl: 'https://www.amazon.com/dp/B0GX9QTR2P',
            tier: 'playwright',
          });
        },
      } as never,
      {
        populate: async (input: { pageContext?: string; searchContext?: string }) => {
          expect(input.pageContext).toContain('Retailer: Amazon');
          expect(input.pageContext).toContain('ASIN: B0GX9QTR2P');
          expect(input.pageContext).toContain('Do not invent');
          expect(input.searchContext).toContain('Fosi Audio DAC');
          return {
            title: 'Fosi Audio DAC',
            price: 49.99,
            description: 'USB DAC amp',
            color: null,
            size: null,
            category: 'Electronics',
            imageUrl: 'https://example.com/img.jpg',
          };
        },
      } as never,
      {
        classify: async () => ({ category: 'Electronics', alternatives: [] }),
      } as never,
      { findById: async () => ({ Id: 'u1', AiEnabled: true, WebSearchEnabled: true }) } as never,
      { execute: async () => undefined } as never,
      {
        findById: async () => ({
          Id: 'list-1',
          AiEnabled: true,
          WebSearchEnabled: true,
        }),
      } as never,
      { findByListId: async () => [] } as never,
      { load: () => aiConfigWithSearch } as never,
      {
        fetchHtml,
        resolveWebsiteName: () => 'Amazon',
        buildContextFromHtml: () => 'ctx',
        fetchContext,
      } as never,
      { research } as never,
      noopScrapeTelemetry
    );

    const result = await useCase.execute('https://a.co/d/09RD8uDq', 'user-1', {
      listId: 'list-1',
    });

    expect(result.data.title).toContain('Fosi');
    expect(result.data.price).toBe(49.99);
    expect(result.diagnostics.blocked).toBe(true);
    expect(result.diagnostics.aiPopulate).toBe('succeeded');
    expect(result.finalUrl).toBe('https://www.amazon.com/dp/B0GX9QTR2P');
    expect(fetchHtml).not.toHaveBeenCalled();
    expect(fetchContext).not.toHaveBeenCalled();
    expect(research).toHaveBeenCalled();
  });

  test('rethrows blocked ScrapeError when AI invents a title without search', async () => {
    const useCase = new ExtractMetadataUseCase(
      {
        resolveFinalUrl: async () => null,
        scrapeFromCapture: async () => {
          throw new Error('scrapeFromCapture not implemented in mock');
        },
        scrape: async () => {
          throw new ScrapeError('Both strategies failed: bot-check:captcha', {
            blocked: true,
            validationReason: 'bot-check:captcha',
            finalUrl: 'https://www.amazon.com/dp/B0FHK6N2H4',
            tier: 'playwright',
          });
        },
      } as never,
      {
        populate: async () => ({
          title: 'AYANEO Pocket MICRO 2',
          price: 199,
          description: 'Handheld gaming console',
          color: null,
          size: null,
          category: 'Electronics',
          imageUrl: 'https://example.com/pocket.jpg',
        }),
      } as never,
      {
        classify: async () => ({ category: 'Electronics', alternatives: [] }),
      } as never,
      { findById: async () => ({ Id: 'u1', AiEnabled: true }) } as never,
      { execute: async () => undefined } as never,
      {} as never,
      { findByListId: async () => [] } as never,
      { load: () => aiConfig } as never,
      {
        fetchHtml: async () => '<html>',
        resolveWebsiteName: () => 'Amazon',
        buildContextFromHtml: () => 'ctx',
        fetchContext: async () => 'ctx',
      } as never,
      undefined,
      noopScrapeTelemetry
    );

    await expect(
      useCase.execute('https://www.amazon.com/dp/B0FHK6N2H4', 'user-1')
    ).rejects.toBeInstanceOf(ScrapeError);
  });

  test('rethrows blocked ScrapeError when AI is disabled', async () => {
    const useCase = new ExtractMetadataUseCase(
      {
        resolveFinalUrl: async () => null,
        scrapeFromCapture: async () => {
          throw new Error('scrapeFromCapture not implemented in mock');
        },
        scrape: async () => {
          throw new ScrapeError('Both strategies failed: bot-check:captcha', {
            blocked: true,
            validationReason: 'bot-check:captcha',
            tier: 'playwright',
          });
        },
      } as never,
      { populate: async () => ({}) } as never,
      { classify: async () => ({ category: 'Home', alternatives: [] }) } as never,
      { findById: async () => ({ Id: 'u1', AiEnabled: false }) } as never,
      { execute: async () => undefined } as never,
      {} as never,
      { findByListId: async () => [] } as never,
      {
        load: () => ({
          ...aiConfig,
          AiEnabled: false,
        }),
      } as never,
      {
        fetchHtml: async () => '',
        resolveWebsiteName: () => 'Amazon',
        buildContextFromHtml: () => '',
        fetchContext: async () => '',
      } as never,
      undefined,
      noopScrapeTelemetry
    );

    await expect(useCase.execute('https://a.co/d/09RD8uDq', 'user-1')).rejects.toBeInstanceOf(
      ScrapeError
    );
  });

  test('rethrows blocked ScrapeError when AI populate returns empty', async () => {
    const useCase = new ExtractMetadataUseCase(
      {
        resolveFinalUrl: async () => null,
        scrapeFromCapture: async () => {
          throw new Error('scrapeFromCapture not implemented in mock');
        },
        scrape: async () => {
          throw new ScrapeError('Both strategies failed: bot-check:captcha', {
            blocked: true,
            validationReason: 'bot-check:captcha',
            finalUrl: 'https://www.amazon.com/dp/B0GX9QTR2P',
            tier: 'playwright',
          });
        },
      } as never,
      {
        populate: async () => ({
          title: '',
          price: null,
          description: null,
          color: null,
          size: null,
          category: null,
          imageUrl: null,
        }),
      } as never,
      {
        classify: async () => ({ category: 'uncategorized', alternatives: [] }),
      } as never,
      { findById: async () => ({ Id: 'u1', AiEnabled: true }) } as never,
      { execute: async () => undefined } as never,
      {} as never,
      { findByListId: async () => [] } as never,
      { load: () => aiConfig } as never,
      {
        fetchHtml: async () => '<html>',
        resolveWebsiteName: () => 'Amazon',
        buildContextFromHtml: () => 'ctx',
        fetchContext: async () => 'ctx',
      } as never,
      undefined,
      noopScrapeTelemetry
    );

    await expect(useCase.execute('https://a.co/d/09RD8uDq', 'user-1')).rejects.toBeInstanceOf(
      ScrapeError
    );
  });
});
