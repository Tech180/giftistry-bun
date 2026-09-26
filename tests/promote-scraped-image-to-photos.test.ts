import { describe, expect, mock, test } from 'bun:test';
import { PromoteScrapedImageToPhotosUseCase } from '../src/modules/item/slices/metadata/use-cases/promote-scraped-image-to-photos.use-case';
import type { Item } from '../src/modules/item/domain/interfaces/item.interface';
import type { RemoteImageFetcher } from '../src/modules/item/domain/ports/remote-image-fetcher.port';

function baseItem(overrides: Partial<Item> = {}): Item {
  return {
    Id: 'item-1',
    ListId: 'list-1',
    PriorityId: null,
    SuggestedByUserId: null,
    Name: 'Widget',
    Description: null,
    IsHiddenIdea: false,
    Category: 'uncategorized',
    Photos: [],
    ...overrides,
  };
}

describe('PromoteScrapedImageToPhotosUseCase', () => {
  test('no-ops when imageUrl is empty', async () => {
    const replacePhotos = mock(() => Promise.resolve());
    const useCase = new PromoteScrapedImageToPhotosUseCase(
      {
        findById: mock(() => Promise.resolve(baseItem())),
        replacePhotos,
      } as never,
      { fetchAsDataUrl: mock(() => Promise.resolve('data:image/jpeg;base64,abc')) }
    );
    expect(await useCase.execute('item-1', null)).toBe(false);
    expect(await useCase.execute('item-1', '  ')).toBe(false);
    expect(replacePhotos).not.toHaveBeenCalled();
  });

  test('no-ops when item already has photos', async () => {
    const fetchAsDataUrl = mock(() =>
      Promise.resolve('data:image/jpeg;base64,abc')
    );
    const replacePhotos = mock(() => Promise.resolve());
    const useCase = new PromoteScrapedImageToPhotosUseCase(
      {
        findById: mock(() =>
          Promise.resolve(
            baseItem({
              Photos: [{ Id: 'p1', Url: 'data:image/png;base64,xx', SortOrder: 0 }],
            })
          )
        ),
        replacePhotos,
      } as never,
      { fetchAsDataUrl } as RemoteImageFetcher
    );

    expect(await useCase.execute('item-1', 'https://cdn.example.com/a.jpg')).toBe(false);
    expect(fetchAsDataUrl).not.toHaveBeenCalled();
    expect(replacePhotos).not.toHaveBeenCalled();
  });

  test('no-ops when fetch returns null', async () => {
    const replacePhotos = mock(() => Promise.resolve());
    const useCase = new PromoteScrapedImageToPhotosUseCase(
      {
        findById: mock(() => Promise.resolve(baseItem())),
        replacePhotos,
      } as never,
      { fetchAsDataUrl: mock(() => Promise.resolve(null)) }
    );

    expect(await useCase.execute('item-1', 'https://cdn.example.com/a.jpg')).toBe(false);
    expect(replacePhotos).not.toHaveBeenCalled();
  });

  test('seeds Photos when empty and fetch succeeds', async () => {
    const dataUrl =
      'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGfAP/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAQUCf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8Bf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8Bf//Z';
    const replacePhotos = mock(() => Promise.resolve());
    const useCase = new PromoteScrapedImageToPhotosUseCase(
      {
        findById: mock(() => Promise.resolve(baseItem({ Photos: [] }))),
        replacePhotos,
      } as never,
      { fetchAsDataUrl: mock(() => Promise.resolve(dataUrl)) }
    );

    expect(await useCase.execute('item-1', 'https://cdn.example.com/a.jpg')).toBe(true);
    expect(replacePhotos).toHaveBeenCalledTimes(1);
    const photos = replacePhotos.mock.calls[0]?.[1] as Array<{ Url: string; SortOrder: number }>;
    expect(photos).toHaveLength(1);
    expect(photos[0]?.Url.startsWith('data:image/jpeg;base64,')).toBe(true);
    expect(photos[0]?.SortOrder).toBe(0);
  });
});
