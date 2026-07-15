import { describe, expect, test } from 'bun:test';
import {
  compilePopulatePrompt,
  isVerboseMarketingDescription,
  isVerboseProductTitle,
  mergeExtractedMetadata,
  mergeFieldMaps,
  shouldAiPopulate,
  shouldRunAiPopulate,
} from '../src/modules/item/infrastructure/gemini-metadata-populator';

const OURA_MARKETING_DESCRIPTION =
  "Introducing the world's smallest smart ring: Oura Ring 5, built with even more sensing power than previous generations. 40% smaller and ultra lightweight, Oura Ring 5 fits seamlessly in with your life and your style. The updated all-titanium design is more scratch-resistant and comfortable than ever, Oura Ring 5 delivers 50+ health metrics with research-grade accuracy. With 1 week of battery life you can even forget it's on. No more compromises when it comes to tracking your health. Oura Ring 5 is FSA/HSA Eligible: we can accept FSA or HSA funds for the following: Oura Ring, additional chargers, and shipping. IMPORTANT: Size yourself with the Oura Ring 5 Sizing Kit before you buy.";

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

  test('appends linked Description and Category prompt sections', () => {
    const prompt = compilePopulatePrompt(
      'Extract fields from {url}',
      { url: 'https://shop.example/item' },
      {
        descriptionPrompt: 'Custom description rules',
        categoryPrompt: 'Custom category rules',
      }
    );

    expect(prompt).toContain('=== Populate Prompt ===');
    expect(prompt).toContain('Extract fields from https://shop.example/item');
    expect(prompt).toContain('=== Description ===');
    expect(prompt).toContain('Custom description rules');
    expect(prompt).toContain('=== Category ===');
    expect(prompt).toContain('Custom category rules');
  });

  test('uses default linked prompts when none provided', () => {
    const prompt = compilePopulatePrompt('Extract', { url: 'https://example.com' });

    expect(prompt).toContain('wishlist assistant');
    expect(prompt).toContain('product categorization assistant');
  });
});

describe('isVerboseMarketingDescription', () => {
  test('flags long marketplace marketing copy', () => {
    expect(isVerboseMarketingDescription(OURA_MARKETING_DESCRIPTION)).toBe(true);
  });

  test('flags short copy with store fluff keywords', () => {
    expect(isVerboseMarketingDescription('FSA/HSA eligible at checkout')).toBe(true);
    expect(isVerboseMarketingDescription('NOTICE: Final payment does not include taxes and duty fees.')).toBe(true);
  });

  test('allows brief product-focused descriptions', () => {
    expect(
      isVerboseMarketingDescription(
        'Smart ring that tracks sleep, activity, and health metrics. Titanium build with about one week of battery life.'
      )
    ).toBe(false);
  });
});

describe('mergeFieldMaps', () => {
  test('prefers scrape field values when requested', () => {
    const merged = mergeFieldMaps(
      { PantsSize: '32x30' },
      { PantsSize: '34x32', ShirtSize: 'L' },
      true
    );

    expect(merged.PantsSize).toBe('32x30');
    expect(merged.ShirtSize).toBe('L');
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
        description: 'Comfortable everyday smart ring for active wearers',
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
    expect(merged.description).toBe('Comfortable everyday smart ring for active wearers');
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
        title: 'Slim Fit Jeans',
        price: null,
        description: null,
        color: null,
        size: '32x30',
        category: null,
        imageUrl: null,
        predefinedFields: { PantsSize: '32x30' },
        userDefinedFields: { Brand: 'Acme' },
      },
      {
        title: 'Slim Fit Jeans',
        price: null,
        description: null,
        color: null,
        size: null,
        category: null,
        imageUrl: null,
        predefinedFields: { ShirtSize: 'L' },
        userDefinedFields: { Material: 'Cotton' },
      },
      false
    );

    expect(merged.predefinedFields?.PantsSize).toBe('32x30');
    expect(merged.predefinedFields?.ShirtSize).toBeUndefined();
    expect(merged.userDefinedFields?.Brand).toBe('Acme');
    expect(merged.userDefinedFields?.Material).toBe('Cotton');
  });

  test('prefers AI description over verbose scraped marketing copy', () => {
    const merged = mergeExtractedMetadata(
      {
        title: 'Oura Ring 5',
        price: 349,
        description: OURA_MARKETING_DESCRIPTION,
        color: 'Silver',
        size: null,
        category: 'tech',
        imageUrl: null,
      },
      {
        title: 'Oura Ring 5',
        price: 349,
        description:
          'Smart ring that tracks sleep, activity, and health metrics. Titanium build with about one week of battery life.',
        color: 'Silver',
        size: null,
        category: null,
        imageUrl: null,
      },
      true
    );

    expect(merged.description).toContain('Smart ring that tracks sleep');
    expect(merged.description).toContain('battery life');
  });

  test('returns null when scrape description is verbose and AI description is empty', () => {
    const merged = mergeExtractedMetadata(
      {
        title: 'Oura Ring 5',
        price: 349,
        description: OURA_MARKETING_DESCRIPTION,
        color: null,
        size: null,
        category: 'tech',
        imageUrl: null,
      },
      {
        title: 'Oura Ring 5',
        price: 349,
        description: null,
        color: null,
        size: null,
        category: null,
        imageUrl: null,
      },
      true
    );

    expect(merged.description).toBeNull();
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
          predefinedFields: { ShirtSize: 'Small' },
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
          predefinedFields: { PreferredColor: 'Red', ShoesSize: '10' },
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
