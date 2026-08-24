import { describe, expect, test, mock } from 'bun:test';
import { ExportWishlistDataUseCase } from '../src/modules/wishlist/application/export-wishlist-data.use-case';

describe('ExportWishlistDataUseCase linked/related columns', () => {
  const wishlist = {
    Id: 'list-1',
    UserId: 'owner-1',
    Title: 'Holiday List',
  };

  const items = [
    {
      Id: 'a',
      Name: 'Shirt',
      Category: 'clothing',
      Priority: 1,
      Description: 'Cotton tee',
      IsFavorite: false,
      IsPinned: false,
      Links: [],
      Metadata: { Text: 'Cotton tee', LinkedItemIds: ['b'] },
    },
    {
      Id: 'b',
      Name: 'Socks',
      Category: 'clothing',
      Priority: 2,
      Description: 'Warm socks',
      IsFavorite: true,
      IsPinned: false,
      Links: [],
      Metadata: { Text: 'Warm socks', LinkedItemIds: ['a'], RelatedItemIds: ['c'] },
    },
    {
      Id: 'c',
      Name: 'Hat',
      Category: 'clothing',
      Priority: 3,
      Description: 'Wool hat',
      IsFavorite: false,
      IsPinned: false,
      Links: [],
      Metadata: { Text: 'Wool hat', RelatedItemIds: ['b'] },
    },
  ];

  function buildUseCase() {
    return new ExportWishlistDataUseCase(
      {
        findById: mock(async () => wishlist),
      } as never,
      {
        execute: mock(async () => ({ Items: items, Groups: [] })),
      } as never,
      {
        findById: mock(async () => ({
          Id: 'owner-1',
          FirstName: 'Ada',
          LastName: 'Lovelace',
          Username: 'ada',
        })),
      } as never
    );
  }

  test('csv includes Linked Items and Related Items peer names', async () => {
    const result = await buildUseCase().execute('list-1', 'owner-1', 'csv');
    expect(typeof result.data).toBe('string');
    const csv = result.data as string;
    expect(csv).toContain('Linked Items');
    expect(csv).toContain('Related Items');
    expect(csv).toContain('Socks');
    expect(csv).toContain('Shirt');
    expect(csv).toContain('Hat');
    // Shirt is linked to Socks
    expect(csv).toMatch(/Shirt[^]*Socks/);
    // Socks is related to Hat
    expect(csv).toMatch(/Socks[^]*Hat/);
  });

  test('xlsx includes Linked Items and Related Items headers', async () => {
    const result = await buildUseCase().execute('list-1', 'owner-1', 'xlsx');
    expect(result.contentType).toContain('spreadsheetml');
    expect(result.data).toBeInstanceOf(Uint8Array);
    expect((result.data as Uint8Array).byteLength).toBeGreaterThan(0);
  });

  test('json includes linkedItems and relatedItems arrays', async () => {
    const result = await buildUseCase().execute('list-1', 'owner-1', 'json');
    const parsed = JSON.parse(result.data as string) as {
      items: Array<{ name: string; linkedItems?: string[]; relatedItems?: string[] }>;
    };
    const shirt = parsed.items.find((item) => item.name === 'Shirt');
    const socks = parsed.items.find((item) => item.name === 'Socks');
    expect(shirt?.linkedItems).toEqual(['Socks']);
    expect(socks?.linkedItems).toEqual(['Shirt']);
    expect(socks?.relatedItems).toEqual(['Hat']);
  });

  test('preserves favorite star from first-class IsFavorite when Description is plain text', async () => {
    const result = await buildUseCase().execute('list-1', 'owner-1', 'csv');
    const csv = result.data as string;
    expect(csv).toMatch(/Socks","\*"/);
  });
});
