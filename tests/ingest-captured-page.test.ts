import { describe, expect, mock, test } from 'bun:test';
import { IngestCapturedPageUseCase } from '../src/modules/item/slices/metadata/use-cases/ingest-captured-page.use-case';
import type { ExtractMetadataUseCase } from '../src/modules/item/slices/metadata/use-cases/extract-metadata.use-case';

const FIXTURE_HTML = `<!doctype html>
<html>
  <head>
    <title>Fixture Mug</title>
    <meta property="og:title" content="Fixture Mug" />
    <meta property="og:image" content="https://cdn.example/mug.jpg" />
    <script type="application/ld+json">
      {"@type":"Product","name":"Fixture Mug","offers":{"price":"12.99"}}
    </script>
  </head>
  <body>${'product body '.repeat(80)}</body>
</html>`;

describe('IngestCapturedPageUseCase', () => {
  test('rejects oversize HTML', async () => {
    const extractMetadata = {
      execute: mock(async () => {
        throw new Error('should not run');
      }),
    } as unknown as ExtractMetadataUseCase;

    const useCase = new IngestCapturedPageUseCase(extractMetadata);
    await expect(
      useCase.execute(
        'https://shop.example.com/mug',
        { html: 'x'.repeat(2 * 1024 * 1024 + 1) },
        'user-1'
      )
    ).rejects.toMatchObject({ errorCode: 'VALIDATION' });
  });

  test('delegates to extract metadata with capture payload', async () => {
    const execute = mock(async () => ({
      data: {
        title: 'Fixture Mug',
        price: 12.99,
        description: null,
        color: null,
        size: null,
        category: null,
        imageUrl: 'https://cdn.example/mug.jpg',
      },
      diagnostics: {
        source: 'fetch',
        confidence: 'high',
        fieldsFound: ['title', 'price', 'imageUrl'],
      },
      finalUrl: 'https://shop.example.com/mug',
    }));

    const extractMetadata = { execute } as unknown as ExtractMetadataUseCase;
    const useCase = new IngestCapturedPageUseCase(extractMetadata);

    const result = await useCase.execute(
      'https://shop.example.com/mug',
      { html: FIXTURE_HTML },
      'user-1',
      { listId: 'list-1' }
    );

    expect(result.data.title).toBe('Fixture Mug');
    expect(execute).toHaveBeenCalledWith('https://shop.example.com/mug', 'user-1', {
      listId: 'list-1',
      deadlineMs: undefined,
      capture: { html: FIXTURE_HTML, capturedJson: undefined },
    });
  });
});

describe('MetadataScraperOrchestrator scrapeFromCapture', () => {
  test('extracts product fields from fixture HTML without fetch', async () => {
    const { MetadataScraperOrchestrator } = await import(
      '../src/modules/item/infrastructure/adapters/metadata-scraper.orchestrator'
    );
    const scraper = new MetadataScraperOrchestrator(
      async () => {
        throw new Error('fetch should not run');
      },
      async () => {
        throw new Error('playwright should not run');
      }
    );

    const result = await scraper.scrapeFromCapture(
      'https://shop.example.com/mug',
      { html: FIXTURE_HTML },
      'full'
    );

    expect(result.data.title).toContain('Fixture Mug');
    expect(result.data.price).toBe(12.99);
    expect(result.diagnostics.confidence).not.toBe('low');
  });
});
