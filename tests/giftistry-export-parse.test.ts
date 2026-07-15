import { describe, expect, test } from 'bun:test';
import { tryParseGiftistryExportDeterministic } from '../src/modules/item/domain/try-parse-giftistry-export';
import { isGiftistryExportCsv, isGiftistryExportJson } from '../src/modules/item/domain/giftistry-export-detect';

const sampleJson = JSON.stringify(
  {
    wishlistTitle: 'Holiday List',
    exportedAt: '2026-07-12T12:00:00.000Z',
    items: [
      {
        name: 'Coffee Maker',
        category: 'Home',
        priority: 1,
        isFavorite: true,
        description: 'Drip coffee',
        links: [
          { url: 'https://example.com/a', retailer: 'Example', price: 49.99 },
          { url: 'https://example.com/b', retailer: 'Other', price: 45 },
        ],
      },
      {
        name: 'Socks',
        category: 'Apparel',
        priority: 2,
        isFavorite: false,
        description: 'Warm socks',
        links: [],
      },
    ],
  },
  null,
  2
);

const sampleCsv = [
  'Category,Priority,Item,Star,Price,Website Link,Description,Audience,Suggestion',
  'Home:,,,,,,,,',
  ',1,Coffee Maker,*,"$49.99",https://example.com/a,Drip coffee,Everyone,',
  ',,,,"",https://example.com/b,,,',
  'Apparel:,,,,,,,,',
  ',2,Socks,,,"",Warm socks,,',
].join('\n');

describe('giftistry export deterministic parse', () => {
  test('detects and parses Giftistry JSON', () => {
    expect(isGiftistryExportJson(JSON.parse(sampleJson))).toBe(true);
    const result = tryParseGiftistryExportDeterministic(sampleJson, 'json');
    expect(result).not.toBeNull();
    expect(result!.parseMode).toBe('deterministic');
    expect(result!.suggestedWishlistTitle).toBe('Holiday List');
    expect(result!.items).toHaveLength(2);
    expect(result!.items[0]).toMatchObject({
      name: 'Coffee Maker',
      category: 'Home',
      priority: 1,
      isFavorite: true,
      websiteLink: 'https://example.com/a',
      price: 49.99,
    });
    expect(result!.warnings.some((w) => w.includes('multiple links'))).toBe(true);
  });

  test('detects and parses Giftistry CSV with category sections', () => {
    expect(isGiftistryExportCsv(sampleCsv)).toBe(true);
    const result = tryParseGiftistryExportDeterministic(sampleCsv, 'csv');
    expect(result).not.toBeNull();
    expect(result!.parseMode).toBe('deterministic');
    expect(result!.items).toHaveLength(2);
    expect(result!.items[0]).toMatchObject({
      name: 'Coffee Maker',
      category: 'Home',
      isFavorite: true,
      websiteLink: 'https://example.com/a',
      price: 49.99,
    });
    expect(result!.items[1]).toMatchObject({
      name: 'Socks',
      category: 'Apparel',
    });
  });

  test('rejects foreign CSV', () => {
    const foreign = 'Name,Price\nMug,10\n';
    expect(isGiftistryExportCsv(foreign)).toBe(false);
    expect(tryParseGiftistryExportDeterministic(foreign, 'csv')).toBeNull();
  });

  test('rejects non-giftistry JSON', () => {
    expect(tryParseGiftistryExportDeterministic('{"foo":1}', 'json')).toBeNull();
  });
});
