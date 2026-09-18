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

  test('replaces the category token', () => {
    const prompt = compilePopulatePrompt('Category={category}', {
      url: 'https://shop.example/item',
      category: 'tech',
    });

    expect(prompt).toContain('Category=tech');
  });

  test('appends Description field guidance and Category section', () => {
    const prompt = compilePopulatePrompt(
      'Extract fields from {url}',
      { url: 'https://shop.example/item' },
      {
        descriptionPrompt: 'Custom description rules that should be ignored',
        categoryPrompt: 'Custom category rules',
      }
    );

    expect(prompt).toContain('=== Populate Prompt ===');
    expect(prompt).toContain('Extract fields from https://shop.example/item');
    expect(prompt).toContain('=== Description ===');
    expect(prompt).toContain('JSON "Description" value must be 1–2 plain sentences');
    expect(prompt).not.toContain('Custom description rules that should be ignored');
    expect(prompt).not.toContain('wishlist assistant');
    expect(prompt).toContain('=== Category ===');
    expect(prompt).toContain('Custom category rules');
    expect(prompt).toContain('=== Output Contract (critical) ===');
  });

  test('uses populate Description guidance and default category prompt', () => {
    const prompt = compilePopulatePrompt('Extract', { url: 'https://example.com' });

    expect(prompt).toContain('JSON "Description" value must be 1–2 plain sentences');
    expect(prompt).not.toContain('wishlist assistant');
    expect(prompt).toContain('product categorization assistant');
  });

  test('substitutes placeholders inside linked Category section only', () => {
    const prompt = compilePopulatePrompt(
      'Extract {itemName}',
      {
        url: 'https://shop.example/item',
        websiteName: 'Example',
        itemName: 'Fosi Audio C3',
        category: 'tech',
        pageContext: 'Brand: Fosi Audio',
      },
      {
        descriptionPrompt: 'Notes for {itemName} at {websiteName} ({category})',
        categoryPrompt: 'Classify {itemName} from {pageContext}',
      }
    );

    expect(prompt).not.toContain('Notes for Fosi Audio C3 at Example (tech)');
    expect(prompt).toContain('Classify Fosi Audio C3 from Brand: Fosi Audio');
    expect(prompt).not.toContain('{itemName}');
    expect(prompt).not.toContain('{websiteName}');
    expect(prompt).not.toContain('{pageContext}');
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

  test('collapses label-equivalent keys preferring AI when preferScrape is false', () => {
    const merged = mergeFieldMaps(
      { 'Memory Type': 'DDR4' },
      { MemoryType: 'DDR5' },
      false
    );
    expect(Object.keys(merged)).toHaveLength(1);
    expect(Object.values(merged)[0]).toBe('DDR5');
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

  test('prefers AI title over mid-length Amazon scrape when preferScrape is true', () => {
    const merged = mergeExtractedMetadata(
      {
        title: 'Dyson V11 Torque Drive Cordless Vacuum Cleaner, Blue',
        price: 599,
        description: null,
        color: 'Blue',
        size: null,
        category: null,
        imageUrl: 'https://cdn.example/scrape.jpg',
      },
      {
        title: 'Dyson V11 Cordless Vacuum Cleaner',
        price: 1,
        description: 'Cordless stick vacuum for whole-home cleaning.',
        color: 'Blue',
        size: null,
        category: 'home',
        imageUrl: 'https://cdn.example/ai.jpg',
        predefinedFields: { Color: 'Blue' },
        userDefinedFields: { Brand: 'Dyson' },
      },
      true
    );

    expect(merged.title).toBe('Dyson V11 Cordless Vacuum Cleaner');
    expect(merged.price).toBe(599);
    expect(merged.imageUrl).toBe('https://cdn.example/scrape.jpg');
    expect(merged.color).toBe('Blue');
    expect(merged.userDefinedFields?.Brand).toBe('Dyson');
  });

  test('falls back to scrape title when AI title is empty', () => {
    const merged = mergeExtractedMetadata(
      {
        title: 'Dyson V11 Torque Drive Cordless Vacuum Cleaner, Blue',
        price: 599,
        description: null,
        color: null,
        size: null,
        category: null,
        imageUrl: null,
      },
      {
        title: '',
        price: null,
        description: null,
        color: null,
        size: null,
        category: null,
        imageUrl: null,
      },
      true
    );

    expect(merged.title).toBe('Dyson V11 Torque Drive Cordless Vacuum Cleaner, Blue');
  });

  test('compacts verbose marketplace scrape title when AI title is empty', () => {
    const merged = mergeExtractedMetadata(
      {
        title:
          'Fosi Audio C3 Gaming DAC Amp for PC, USB Headphone Amplifier with 7.1 Surround Sound, Desktop Volume Control, Footstep Enhancement, Compatible with PS5, Switch, Laptop, Headset for FPS',
        price: 129.99,
        description: 'Amazon.com: Fosi Audio C3 Gaming DAC Amp for PC : Electronics',
        color: null,
        size: null,
        category: null,
        imageUrl: null,
      },
      {
        title: '',
        price: 129.99,
        description: 'USB gaming DAC amp with StepSense footstep enhancement and 7.1 surround.',
        color: null,
        size: null,
        category: null,
        imageUrl: null,
        userDefinedFields: { Brand: 'Fosi Audio' },
      },
      true
    );

    expect(merged.title).toBe('Fosi Audio C3 Gaming DAC Amp for PC');
    expect(merged.description).toContain('StepSense');
    expect(merged.userDefinedFields?.Brand).toBe('Fosi Audio');
  });

  test('compacts verbose AI title that echoed marketplace SEO', () => {
    const longTitle =
      'Fosi Audio C3 Gaming DAC Amp for PC, USB Headphone Amplifier with 7.1 Surround Sound, Desktop Volume Control, Footstep Enhancement, Compatible with PS5, Switch, Laptop, Headset for FPS';
    const merged = mergeExtractedMetadata(
      {
        title: longTitle,
        price: 129.99,
        description: `Amazon.com: ${longTitle} : Electronics`,
        color: null,
        size: null,
        category: null,
        imageUrl: null,
      },
      {
        title: longTitle,
        price: 129.99,
        description: `Amazon.com: ${longTitle} : Electronics`,
        color: null,
        size: null,
        category: null,
        imageUrl: null,
      },
      true
    );

    expect(merged.title).toBe('Fosi Audio C3 Gaming DAC Amp for PC');
    expect(merged.description).toBeNull();
  });

  test('prefers AI attribute fields over scrape when both are set', () => {
    const merged = mergeExtractedMetadata(
      {
        title: 'Tee',
        price: 20,
        description: null,
        color: 'Red',
        size: 'M',
        category: 'clothing',
        imageUrl: 'https://cdn.example/scrape.jpg',
        predefinedFields: { ShirtSize: 'M' },
        userDefinedFields: { Brand: 'ScrapeBrand' },
      },
      {
        title: 'Tee',
        price: 99,
        description: null,
        color: 'Navy',
        size: 'L',
        category: 'apparel',
        imageUrl: 'https://cdn.example/ai.jpg',
        predefinedFields: { ShirtSize: 'L' },
        userDefinedFields: { Brand: 'AiBrand' },
      },
      true
    );

    expect(merged.color).toBe('Navy');
    expect(merged.size).toBe('L');
    expect(merged.category).toBe('apparel');
    expect(merged.predefinedFields?.ShirtSize).toBe('L');
    expect(merged.userDefinedFields?.Brand).toBe('AiBrand');
    expect(merged.price).toBe(20);
    expect(merged.imageUrl).toBe('https://cdn.example/scrape.jpg');
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
