import { describe, expect, mock, test } from 'bun:test';
import { compilePopulatePrompt } from '../src/modules/item/infrastructure/utils/compile-populate-prompt.util';
import type { MetadataPopulatorConfig } from '../src/modules/item/domain/interfaces/metadata-populator-config.interface';
import type { MetadataPopulatorInput } from '../src/modules/item/domain/interfaces/metadata-populator-input.interface';
import { resolveAiMetadataExtractionOptions } from '../src/modules/system';

const stableInput: MetadataPopulatorInput = {
  url: 'https://shop.example/widgets/abc?ref=1',
  websiteName: 'Example Shop',
  pageContext: 'Product Name: Widget Pro\nBrand: Acme',
  searchContext: 'None',
  itemName: 'Widget Pro',
  category: 'tech',
  reconcileSources: false,
};

describe('compilePopulatePrompt determinism', () => {
  test('byte-identical across repeated compiles for the same input', () => {
    const prompts = Array.from({ length: 5 }, () =>
      compilePopulatePrompt('', stableInput, undefined, {
        profile: 'full',
        includeCategoryHub: true,
      })
    );
    const first = prompts[0]!;
    for (const prompt of prompts) {
      expect(prompt).toBe(first);
    }
    expect(first).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  test('stable when predefined field maps use insertion order', () => {
    const input: MetadataPopulatorInput = {
      ...stableInput,
      pageContext: `Known fields:\n${JSON.stringify({
        PredefinedFields: { Zebra: 'z', Alpha: 'a' },
        UserDefinedFields: { Brand: 'Acme' },
      })}`,
    };
    const a = compilePopulatePrompt('', input);
    const b = compilePopulatePrompt('', input);
    expect(a).toBe(b);
  });
});

describe('runMetadataPopulateStrategy prompt determinism', () => {
  test('same compiled prompt and temperature 0 on repeated runs', async () => {
    const capturedConfigs: Array<{ prompt: string; temperature?: number }> = [];

    mock.module('../src/modules/item/infrastructure/utils/ai-text-completion.util', () => ({
      completeTextPromptStream: async (prompt: string, config: { temperature?: number }) => {
        capturedConfigs.push({ prompt, temperature: config.temperature });
        return {
          text: JSON.stringify({
            Title: 'Widget Pro',
            Price: 19.99,
            Description: 'A widget.',
            Color: null,
            Size: null,
            ImageUrl: null,
            PredefinedFields: {},
            UserDefinedFields: {},
          }),
          usage: {},
        };
      },
      completeTextPrompt: async () => '',
    }));

    const { runMetadataPopulateStrategy } = await import(
      `../src/modules/item/infrastructure/utils/run-metadata-populate-strategy.util.ts?determinism=${Date.now()}`
    );

    const config: MetadataPopulatorConfig = {
      provider: 'local',
      apiKey: '',
      model: 'test-model',
      endpoint: 'http://127.0.0.1:11434/v1',
      customPrompt: '',
      extractionOptions: resolveAiMetadataExtractionOptions({
        AiMetadataExtractionPreset: 'full',
      }),
    };

    for (let i = 0; i < 3; i += 1) {
      await runMetadataPopulateStrategy(stableInput, config);
    }

    expect(capturedConfigs.length).toBe(3);
    const firstPrompt = capturedConfigs[0]!.prompt;
    for (const row of capturedConfigs) {
      expect(row.prompt).toBe(firstPrompt);
      expect(row.temperature).toBe(0);
    }
  });
});
