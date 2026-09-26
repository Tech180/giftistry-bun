import { describe, expect, mock, test } from 'bun:test';
import { EnrichLinkMetadataUseCase } from '../src/modules/item/slices/metadata/use-cases/enrich-link-metadata.use-case';

describe('EnrichLinkMetadataUseCase', () => {
  test('persists canonical URL and promotes when Photos path is available', async () => {
    const updateLink = mock(() =>
      Promise.resolve({
        Id: 'link-1',
        ItemId: 'item-1',
        Url: 'https://cdn.example.com/canonical',
        RetailerName: 'Example',
        ExtractedPrice: 12,
        ExtractedImageUrl: 'https://cdn.example.com/a.jpg',
      })
    );
    const findItemIdByLinkId = mock(() => Promise.resolve('item-1'));
    const findLinksByItemId = mock(() => Promise.resolve([]));
    const promote = mock(() => Promise.resolve(true));

    const useCase = new EnrichLinkMetadataUseCase(
      {
        scrape: mock(() =>
          Promise.resolve({
            data: { price: 12, imageUrl: 'https://cdn.example.com/a.jpg' },
            diagnostics: { confidence: 'high' },
            finalUrl: 'https://shop.example.com/p/canonical',
            websiteName: 'Example',
          })
        ),
      } as never,
      {
        updateLink,
        findItemIdByLinkId,
        findLinksByItemId,
      } as never,
      { execute: promote } as never
    );

    await useCase.execute('link-1', 'https://bit.ly/short', null);

    expect(updateLink).toHaveBeenCalledWith(
      'link-1',
      'https://shop.example.com/p/canonical',
      'Example',
      12,
      null
    );
    expect(findItemIdByLinkId).toHaveBeenCalledWith('link-1');
    expect(promote).toHaveBeenCalledWith('item-1', 'https://cdn.example.com/a.jpg');
  });

  test('skips promote when scrape has no imageUrl', async () => {
    const promote = mock(() => Promise.resolve(true));
    const updateLink = mock(() =>
      Promise.resolve({
        Id: 'link-1',
        ItemId: 'item-1',
        Url: 'https://shop.example.com/p',
        RetailerName: null,
        ExtractedPrice: 9,
        ExtractedImageUrl: null,
      })
    );
    const useCase = new EnrichLinkMetadataUseCase(
      {
        scrape: mock(() =>
          Promise.resolve({
            data: { price: 9, imageUrl: null },
            diagnostics: { confidence: 'high' },
          })
        ),
      } as never,
      {
        updateLink,
        findItemIdByLinkId: mock(() => Promise.resolve('item-1')),
        findLinksByItemId: mock(() => Promise.resolve([])),
      } as never,
      { execute: promote } as never
    );

    await useCase.execute('link-1', 'https://shop.example.com/p', null);
    expect(promote).not.toHaveBeenCalled();
    expect(updateLink).toHaveBeenCalled();
  });
});
