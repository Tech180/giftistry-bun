import { describe, expect, mock, test } from 'bun:test';
import { ExportWishlistDataUseCase } from '../src/modules/wishlist/slices/export/use-cases/export-wishlist-data.use-case';
import { tryParseGiftistryExportDeterministic } from '../src/modules/item/domain/utils/try-parse-giftistry-export.util';
import { DefaultImportFileTextExtractor } from '../src/modules/item/infrastructure/adapters/import-file-text-extractor';

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
    Links: [{ Url: 'https://shop.example/shirt', RetailerName: 'Shop', ExtractedPrice: 20 }],
    Metadata: { Text: 'Cotton tee', LinkedItemIds: ['b'] },
  },
  {
    Id: 'b',
    Name: 'Socks',
    Category: 'clothing',
    Priority: 2,
    Description: 'Warm socks',
    IsFavorite: true,
    Links: [],
    Metadata: { Text: 'Warm socks', LinkedItemIds: ['a'], RelatedItemIds: ['c'] },
  },
];

function buildUseCase() {
  return new ExportWishlistDataUseCase(
    { findById: mock(async () => wishlist) } as never,
    { execute: mock(async () => ({ Items: items, Groups: [] })) } as never,
    {
      findById: mock(async () => ({
        Id: 'owner-1',
        FirstName: 'Ada',
        LastName: 'Lovelace',
        Username: 'ada',
      })),
    } as never,
    {
      execute: mock(async () => ({
        listId: 'list-1',
        role: 'owner',
        isExpired: false,
        isActive: true,
      })),
    } as never
  );
}

describe('giftistry export then import preview', () => {
  test('csv, txt, json, and markdown exports parse without AI', async () => {
    const useCase = buildUseCase();
    for (const format of ['csv', 'txt', 'json', 'md'] as const) {
      const exported = await useCase.execute('list-1', 'owner-1', format);
      const text = exported.data as string;
      const parsed = tryParseGiftistryExportDeterministic(text, format === 'md' ? 'md' : format);
      expect(parsed?.parseMode).toBe('deterministic');
      expect(parsed?.items.map((item) => item.name).sort()).toEqual(['Shirt', 'Socks']);
      const shirt = parsed?.items.find((item) => item.name === 'Shirt');
      expect(shirt?.linkedPeerNames).toEqual(['Socks']);
      expect(shirt?.websiteLink).toBe('https://shop.example/shirt');
    }
  });

  test('xlsx export text parses as a Giftistry sheet', async () => {
    const exported = await buildUseCase().execute('list-1', 'owner-1', 'xlsx');
    const extractor = new DefaultImportFileTextExtractor();
    const extracted = await extractor.extract({
      fileName: exported.filename,
      format: 'xlsx',
      content: Buffer.from(exported.data as Uint8Array).toString('base64'),
      contentEncoding: 'base64',
    });
    const parsed = tryParseGiftistryExportDeterministic(extracted.text, 'xlsx');
    expect(parsed?.items.find((item) => item.name === 'Shirt')?.linkedPeerNames).toEqual(['Socks']);
    expect(parsed?.items.find((item) => item.name === 'Socks')?.linkedPeerNames).toEqual(['Shirt']);
  });
});
