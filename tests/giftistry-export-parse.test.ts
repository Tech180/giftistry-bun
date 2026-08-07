import { describe, expect, test } from 'bun:test';
import { tryParseGiftistryExportDeterministic } from '../src/modules/item/domain/try-parse-giftistry-export';
import {
  isGiftistryExportCsv,
  isGiftistryExportJson,
  isGiftistryExportTxt,
} from '../src/modules/item/domain/giftistry-export-detect';

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

const sampleXlsxText = [
  '# Sheet: Wishlist',
  'Category\tPriority\tItem\tStar\tPrice\tWebsite\tDescription\tAudience\tSuggestion',
  'Home:\t\t\t\t\t\t\t\t',
  '\t1\tCoffee Maker\t*\t$49.99\thttps://example.com/a\tDrip coffee\tEveryone\t',
  'Apparel:\t\t\t\t\t\t\t\t',
  '\t2\tSocks\t\t\t\tWarm socks\t\t',
].join('\n');

const sampleTxt = [
  '============================================================',
  'WISHLIST REGISTRY: HOLIDAY LIST',
  '============================================================',
  '',
  '[HOME]',
  '------',
  '★ Coffee Maker - $49.99 (Priority: 1)',
  '    Link: Example (https://example.com/a)',
  '    Description: Drip coffee',
  '    Audience: Everyone',
  '',
  '  Coffee Maker - $45.00 (Priority: 1)',
  '    Link: Other (https://example.com/b)',
  '    Description: Drip coffee',
  '    Audience: Everyone',
  '',
  '[APPAREL]',
  '---------',
  '  Socks (Priority: 2)',
  '    Description: Warm socks',
  '    Audience: Everyone',
  '',
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

  test('parses Giftistry XLSX extract (tab + Website header + sheet preamble)', () => {
    expect(isGiftistryExportCsv(sampleXlsxText)).toBe(true);
    const result = tryParseGiftistryExportDeterministic(sampleXlsxText, 'xlsx');
    expect(result).not.toBeNull();
    expect(result!.sourceFormat).toBe('xlsx');
    expect(result!.parseMode).toBe('deterministic');
    expect(result!.items).toHaveLength(2);
    expect(result!.items[0]).toMatchObject({
      name: 'Coffee Maker',
      category: 'Home',
      isFavorite: true,
      websiteLink: 'https://example.com/a',
      price: 49.99,
    });
  });

  test('parses Giftistry TXT export', () => {
    expect(isGiftistryExportTxt(sampleTxt)).toBe(true);
    const result = tryParseGiftistryExportDeterministic(sampleTxt, 'txt');
    expect(result).not.toBeNull();
    expect(result!.sourceFormat).toBe('txt');
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
      description: 'Drip coffee',
    });
    expect(result!.items[1]).toMatchObject({
      name: 'Socks',
      category: 'Apparel',
      priority: 2,
      description: 'Warm socks',
    });
    expect(result!.warnings.some((w) => w.includes('multiple links'))).toBe(true);
  });

  test('rejects foreign CSV', () => {
    const foreign = 'Name,Price\nMug,10\n';
    expect(isGiftistryExportCsv(foreign)).toBe(false);
    expect(tryParseGiftistryExportDeterministic(foreign, 'csv')).toBeNull();
  });

  test('rejects foreign TXT', () => {
    expect(isGiftistryExportTxt('just some notes')).toBe(false);
    expect(tryParseGiftistryExportDeterministic('just some notes', 'txt')).toBeNull();
  });

  test('rejects non-giftistry JSON', () => {
    expect(tryParseGiftistryExportDeterministic('{"foo":1}', 'json')).toBeNull();
  });
});
