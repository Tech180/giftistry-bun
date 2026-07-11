import { describe, expect, test } from 'bun:test';
import {
  compilePopulatePrompt,
  isVerboseProductTitle,
  mergeExtractedMetadata,
  mergeFieldMaps,
  shouldAiPopulate,
  shouldRunAiPopulate,
} from '../src/modules/item/infrastructure/gemini-metadata-populator';

describe('compilePopulatePrompt', () => {
  test('replaces populate prompt tokens', () => {
    const prompt = compilePopulatePrompt('URL={url}; Store={websiteName}; Context={pageContext}', {
      url: 'https://shop.example/item',
      websiteName: 'Example',
      pageContext: 'Title: Tee',
    });

    expect(prompt).toContain('URL=https://shop.example/item');
    expect(prompt).toContain('Store=Example');
    expect(prompt).toContain('Context=Title: Tee');
  });
});

describe('mergeFieldMaps', () => {
  test('prefers scrape field values when requested', () => {
    const merged = mergeFieldMaps(
      { pantsSize: '32x30' },
      { pantsSize: '34x32', shirtSize: 'L' },
      true
    );

    expect(merged.pantsSize).toBe('32x30');
    expect(merged.shirtSize).toBe('L');
  });
});

describe('mergeExtractedMetadata', () => {
  test('prefers AI cleaned title when AI populate returns one', () => {
    const merged = mergeExtractedMetadata(
      {
        title: 'Oura Ring 5 - Silver - Size 8 - Worlds Smallest Smart Ring',
        price: 10,
        description: null,
        color: 'Silver',
        size: null,
        category: 'clothing',
        imageUrl: null,
      },
      {
        title: 'Oura Ring 5',
        price: 20,
        description: 'AI desc',
        color: 'Silver',
        size: '8',
        category: 'tech',
        imageUrl: null,
        predefinedFields: { Color: 'Silver' },
        userDefinedFields: { Size: '8' },
      },
      true
    );

    expect(merged.title).toBe('Oura Ring 5');
    expect(merged.price).toBe(10);
    expect(merged.color).toBe('Silver');
    expect(merged.description).toBe('AI desc');
    expect(merged.size).toBe('8');
  });

  test('uses AI values when scrape is empty', () => {
    const merged = mergeExtractedMetadata(
      {
        title: '',
        price: null,
        description: null,
        color: null,
        size: null,
        category: null,
        imageUrl: null,
      },
      {
        title: 'AI Title',
        price: 25,
        description: 'Notes',
        color: 'Black',
        size: 'M',
        category: 'clothing',
        imageUrl: 'https://img.example/a.jpg',
      },
      false
    );

    expect(merged.title).toBe('AI Title');
    expect(merged.price).toBe(25);
    expect(merged.category).toBe('clothing');
  });

  test('merges predefined and userDefined field maps', () => {
    const merged = mergeExtractedMetadata(
      {
        title: 'Item',
        price: null,
        description: null,
        color: null,
        size: null,
        category: null,
        imageUrl: null,
        predefinedFields: { pantsSize: '32x30' },
        userDefinedFields: { Brand: 'Acme' },
      },
      {
        title: 'Item',
        price: null,
        description: null,
        color: null,
        size: null,
        category: null,
        imageUrl: null,
        predefinedFields: { shirtSize: 'L' },
        userDefinedFields: { Material: 'Cotton' },
      },
      false
    );

    expect(merged.predefinedFields?.pantsSize).toBe('32x30');
    expect(merged.predefinedFields?.shirtSize).toBe('L');
    expect(merged.userDefinedFields?.Brand).toBe('Acme');
    expect(merged.userDefinedFields?.Material).toBe('Cotton');
  });
});

describe('shouldAiPopulate', () => {
  test('returns false when AI is disabled', () => {
    expect(
      shouldAiPopulate(
        {
          data: { title: '', price: null, description: null, color: null, size: null, category: null, imageUrl: null },
          diagnostics: { confidence: 'low', blocked: true },
        },
        false
      )
    ).toBe(false);
  });

  test('returns true when scrape is blocked', () => {
    expect(
      shouldAiPopulate(
        {
          data: { title: 'Item', price: 10, description: null, color: null, size: null, category: null, imageUrl: null },
          diagnostics: { confidence: 'high', blocked: true, fieldsFound: ['title', 'price'] },
        },
        true
      )
    ).toBe(true);
  });
});

describe('shouldRunAiPopulate', () => {
  test('runs populate when scrape mapped no custom fields', () => {
    expect(
      shouldRunAiPopulate(
        {
          data: { title: 'Item', price: 10, description: 'Desc', color: null, size: null, category: 'tech', imageUrl: null },
          diagnostics: { confidence: 'high', fieldsFound: ['title', 'price', 'description'] },
        },
        {
          title: 'Item',
          price: 10,
          description: 'Desc',
          color: null,
          size: null,
          category: 'tech',
          imageUrl: null,
          predefinedFields: {},
          userDefinedFields: {},
        },
        true
      )
    ).toBe(true);
  });

  test('skips populate when apparel size and material are already mapped', () => {
    expect(
      shouldRunAiPopulate(
        {
          data: { title: 'NetNoodz T-shirt', price: 34.99, description: 'Polyblend tee', color: null, size: 'Small', category: 'clothing', imageUrl: null },
          diagnostics: { confidence: 'high', fieldsFound: ['title', 'price', 'size', 'description'] },
        },
        {
          title: 'NetNoodz T-shirt',
          price: 34.99,
          description: 'Polyblend tee',
          color: null,
          size: 'Small',
          category: 'clothing',
          imageUrl: null,
          predefinedFields: { shirtSize: 'Small' },
          userDefinedFields: { Brand: 'LTTStore', Material: 'Polyblend' },
        },
        true
      )
    ).toBe(false);
  });

  test('runs populate when scrape only mapped predefined fields', () => {
    expect(
      shouldRunAiPopulate(
        {
          data: { title: 'Sneaker', price: 80, description: null, color: 'Red', size: '10', category: 'apparel', imageUrl: null },
          diagnostics: { confidence: 'high', fieldsFound: ['title', 'price', 'color', 'size'] },
        },
        {
          title: 'Sneaker',
          price: 80,
          description: null,
          color: 'Red',
          size: '10',
          category: 'apparel',
          imageUrl: null,
          predefinedFields: { preferredColor: 'Red', shoesSize: '10' },
          userDefinedFields: {},
        },
        true
      )
    ).toBe(true);
  });

  test('runs populate when scraped title is verbose marketplace copy', () => {
    expect(
      isVerboseProductTitle(
        "Oura Ring 5 - Silver - Size 8 - World's Smallest Smart Ring - Sleep, Activity"
      )
    ).toBe(true);

    expect(
      shouldRunAiPopulate(
        {
          data: {
            title: "Oura Ring 5 - Silver - Size 8 - World's Smallest Smart Ring",
            price: 349,
            description: 'Smart ring',
            color: 'Silver',
            size: null,
            category: 'tech',
            imageUrl: null,
          },
          diagnostics: { confidence: 'high', fieldsFound: ['title', 'price', 'description', 'color'] },
        },
        {
          title: "Oura Ring 5 - Silver - Size 8 - World's Smallest Smart Ring",
          price: 349,
          description: 'Smart ring',
          color: 'Silver',
          size: null,
          category: 'tech',
          imageUrl: null,
          predefinedFields: { Color: 'Silver' },
          userDefinedFields: { Brand: 'Oura' },
        },
        true
      )
    ).toBe(true);
  });
});
