import { describe, expect, test } from 'bun:test';
import { mapAiImportItems, compileImportPrompt } from '../src/modules/item/infrastructure/gemini-item-import-parser';
import {
  cellValueToText,
  DefaultImportFileTextExtractor,
} from '../src/modules/item/infrastructure/import-file-text-extractor';

describe('gemini-item-import-parser helpers', () => {
  test('compileImportPrompt substitutes tokens', () => {
    const prompt = compileImportPrompt(
      'File {fileName} format {format} title {wishlistTitle} cats {existingCategories}\n{fileContent}',
      {
        fileName: 'list.json',
        format: 'json',
        fileContent: 'CONTENT',
        wishlistTitle: 'Holiday',
        existingCategories: 'Home, Tech',
      }
    );
    expect(prompt).toContain('list.json');
    expect(prompt).toContain('CONTENT');
    expect(prompt).toContain('Holiday');
  });

  test('mapAiImportItems normalizes AI JSON payload', () => {
    const items = mapAiImportItems({
      Items: [
        {
          Name: ' Mug ',
          Category: 'Home',
          Priority: '2',
          Price: '$12.50',
          WebsiteLink: 'https://example.com',
          IsFavorite: true,
        },
        { Name: '' },
      ],
    });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      name: 'Mug',
      category: 'Home',
      priority: 2,
      price: 12.5,
      websiteLink: 'https://example.com',
      isFavorite: true,
    });
  });
});

describe('cellValueToText', () => {
  test('prefers hyperlink href over display text', () => {
    expect(
      cellValueToText({
        text: 'amazon.com',
        hyperlink: 'https://www.amazon.com/dp/B0TEST123',
      })
    ).toBe('https://www.amazon.com/dp/B0TEST123');
  });

  test('falls back to text when hyperlink is missing', () => {
    expect(cellValueToText({ text: 'plain label' })).toBe('plain label');
  });
});

describe('DefaultImportFileTextExtractor', () => {
  test('extracts plain text content', async () => {
    const extractor = new DefaultImportFileTextExtractor();
    const result = await extractor.extract({
      fileName: 'notes.txt',
      format: 'txt',
      content: 'hello wishlist',
      contentEncoding: 'text',
    });
    expect(result.text).toBe('hello wishlist');
    expect(result.format).toBe('txt');
    expect(result.truncated).toBe(false);
  });
});
