import { describe, expect, mock, test } from 'bun:test';
import { compilePopulatePrompt } from '../src/modules/item/infrastructure/utils/compile-populate-prompt.util';
import { mergePopulateResultsForTests } from '../src/modules/item/infrastructure/utils/run-metadata-populate-strategy.util';
import { POPULATE_HUB_HEADERS } from '../src/modules/item/infrastructure/constants/populate-hub-headers.constant';
import type { MetadataPopulatorConfig } from '../src/modules/item/domain/interfaces/metadata-populator-config.interface';
import type { MetadataPack } from '../src/modules/system';
import { resolveAiMetadataExtractionOptions } from '../src/modules/system';

const baseInput = {
  url: 'https://example.com/p',
  websiteName: 'Example',
  pageContext: 'Product Name: Widget\nBrand: Acme',
  itemName: 'Widget',
  category: 'tech',
};

describe('compilePopulatePrompt profiles', () => {
  test('full profile includes category hub headers', () => {
    const prompt = compilePopulatePrompt('', baseInput, undefined, {
      profile: 'full',
      includeCategoryHub: true,
    });
    expect(prompt).toContain(POPULATE_HUB_HEADERS.populate);
    expect(prompt).toContain(POPULATE_HUB_HEADERS.category);
  });

  test('compact profile omits category hub', () => {
    const prompt = compilePopulatePrompt('', baseInput, undefined, {
      profile: 'compact',
      includeCategoryHub: false,
    });
    expect(prompt).not.toContain(POPULATE_HUB_HEADERS.category);
    expect(prompt).toContain('Output Contract');
  });
});

describe('mergePopulateResultsForTests', () => {
  test('overlays pack fields onto core', () => {
    const merged = mergePopulateResultsForTests(
      {
        title: 'Core',
        price: 10,
        description: 'Desc',
        color: null,
        size: null,
        category: null,
        imageUrl: null,
        predefinedFields: { ModelNumber: 'A' },
        userDefinedFields: {},
      },
      {
        title: '',
        price: null,
        description: null,
        color: 'Red',
        size: null,
        category: null,
        imageUrl: null,
        predefinedFields: { Cores: '8' },
        userDefinedFields: { Brand: 'Acme' },
      }
    );
    expect(merged.title).toBe('Core');
    expect(merged.price).toBe(10);
    expect(merged.color).toBe('Red');
    expect(merged.predefinedFields).toEqual({ ModelNumber: 'A', Cores: '8' });
    expect(merged.userDefinedFields).toEqual({ Brand: 'Acme' });
  });
});

describe('runMetadataPopulateStrategy split', () => {
  test('thorough split makes core then pack calls', async () => {
    const calls: string[] = [];
    mock.module('../src/modules/item/infrastructure/utils/ai-text-completion.util', () => ({
      completeTextPromptStream: async (prompt: string) => {
        calls.push(prompt);
        if (calls.length === 1) {
          return {
            text: JSON.stringify({
              Title: 'Widget',
              Price: 9.99,
              Description: 'A widget.',
              Color: null,
              Size: null,
              ImageUrl: null,
              PredefinedFields: {},
              UserDefinedFields: {},
            }),
            usage: {},
          };
        }
        return {
          text: JSON.stringify({
            PredefinedFields: { Cores: '8' },
            UserDefinedFields: { Brand: 'Acme' },
          }),
          usage: {},
        };
      },
      completeTextPrompt: async () => '',
    }));

    const { runMetadataPopulateStrategy } = await import(
      `../src/modules/item/infrastructure/utils/run-metadata-populate-strategy.util.ts?split=${Date.now()}`
    );

    const pack: MetadataPack = {
      id: 'technology.cpu',
      label: 'CPU',
      description: '',
      match: { categories: ['tech'], titleKeywords: [] },
      fields: [{ key: 'Cores', label: 'Cores', bucket: 'predefined' }],
      promptFragment: 'Extract CPU cores.',
    };

    const config: MetadataPopulatorConfig = {
      provider: 'local',
      apiKey: '',
      model: 'test',
      endpoint: 'http://localhost',
      customPrompt: '',
      extractionOptions: resolveAiMetadataExtractionOptions({
        AiMetadataExtractionPreset: 'thorough',
      }),
      packs: [pack],
    };

    const result = await runMetadataPopulateStrategy(baseInput, config);
    expect(calls.length).toBe(2);
    expect(calls[1]).toContain('=== Metadata Packs ===');
    expect(result.title).toBe('Widget');
    expect(result.predefinedFields?.Cores).toBe('8');
    expect(result.userDefinedFields?.Brand).toBe('Acme');
  });
});
