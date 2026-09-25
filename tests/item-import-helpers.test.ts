import { describe, expect, test } from 'bun:test';
import { mapAiImportItems, compileImportPrompt } from '../src/modules/item/infrastructure/gemini-item-import-parser';
import {
  cellValueToText,
  DefaultImportFileTextExtractor,
} from '../src/modules/item/infrastructure/import-file-text-extractor';
import { workbookBytesToText } from '../src/modules/item/infrastructure/xlsx-workbook-to-text.util';

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

  test('compileImportPrompt appends category preservation when optimizeCategories is false', () => {
    const prompt = compileImportPrompt('Base\n{fileContent}', {
      fileName: 'list.json',
      format: 'json',
      fileContent: 'CONTENT',
      optimizeCategories: false,
    });
    expect(prompt).toContain('CATEGORY PRESERVATION');
    expect(prompt).toContain('exactly as written');
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

  test('mapAiImportItems maps Color Size and CustomFields into preview', () => {
    const items = mapAiImportItems({
      Items: [
        {
          Name: 'Tee',
          Category: 'Apparel',
          Color: 'Navy',
          Size: 'M',
          CustomFields: {
            Predefined: { ShirtSize: 'M' },
            UserDefined: { Brand: 'Acme' },
          },
        },
      ],
    });
    expect(items).toHaveLength(1);
    expect(items[0].color).toBe('Navy');
    expect(items[0].customFields?.Predefined.Color).toBe('Navy');
    expect(items[0].customFields?.Predefined.ShirtSize).toBe('M');
    expect(items[0].customFields?.UserDefined.Brand).toBe('Acme');
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

  test('extracts xlsx cells and prefers hyperlink href', async () => {
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Wishlist');
    sheet.addRow([
      'Category',
      'Priority',
      'Item',
      'Star',
      'Price',
      'Website',
      'Description',
      'Audience',
      'Suggestion',
    ]);
    const row = sheet.addRow(['', 1, 'Mug', '', '$12.00', 'amazon.com', 'Ceramic', '', '']);
    row.getCell(6).value = {
      text: 'amazon.com',
      hyperlink: 'https://www.amazon.com/dp/B0TEST123',
    };
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const extractor = new DefaultImportFileTextExtractor();
    const result = await extractor.extract({
      fileName: 'holiday.xlsx',
      format: 'xlsx',
      content: buffer.toString('base64'),
      contentEncoding: 'base64',
    });
    expect(result.format).toBe('xlsx');
    expect(result.text).toContain('# Sheet: Wishlist');
    expect(result.text).toContain('Mug');
    expect(result.text).toContain('https://www.amazon.com/dp/B0TEST123');
    expect(result.text).not.toMatch(/\tamazon\.com\t/);
  });

  test('forwards maxSheets and maxRowsPerSheet to workbook conversion', async () => {
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    const first = workbook.addWorksheet('Wishlist');
    first.addRow(['Category', 'Priority', 'Item', 'Star', 'Price', 'Website', 'Description', 'Audience', 'Suggestion']);
    first.addRow(['', 1, 'Mug', '', '', '', '', '', '']);
    first.addRow(['', 2, 'Lamp', '', '', '', '', '', '']);
    const second = workbook.addWorksheet('Extra');
    second.addRow(['noise']);
    second.addRow(['should not appear']);
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const extractor = new DefaultImportFileTextExtractor();
    const result = await extractor.extract({
      fileName: 'holiday.xlsx',
      format: 'xlsx',
      content: buffer.toString('base64'),
      contentEncoding: 'base64',
      maxSheets: 1,
      maxRowsPerSheet: 2,
    });
    expect(result.text).toContain('# Sheet: Wishlist');
    expect(result.text).toContain('Mug');
    expect(result.text).not.toContain('Lamp');
    expect(result.text).not.toContain('# Sheet: Extra');
    expect(result.text).not.toContain('should not appear');
  });
});

describe('workbookBytesToText limits', () => {
  test('maxSheets omits later worksheets', async () => {
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet('One').addRow(['alpha']);
    workbook.addWorksheet('Two').addRow(['beta']);
    const bytes = new Uint8Array(await workbook.xlsx.writeBuffer());
    const text = await workbookBytesToText(bytes, { maxSheets: 1 });
    expect(text).toContain('# Sheet: One');
    expect(text).toContain('alpha');
    expect(text).not.toContain('# Sheet: Two');
    expect(text).not.toContain('beta');
  });

  test('maxRowsPerSheet stops after N sheet rows', async () => {
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Wishlist');
    sheet.addRow(['header']);
    sheet.addRow(['row-two']);
    sheet.addRow(['row-three']);
    const bytes = new Uint8Array(await workbook.xlsx.writeBuffer());
    const text = await workbookBytesToText(bytes, { maxRowsPerSheet: 2 });
    expect(text).toContain('header');
    expect(text).toContain('row-two');
    expect(text).not.toContain('row-three');
  });
});
