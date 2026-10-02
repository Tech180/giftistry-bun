import { describe, expect, mock, test } from 'bun:test';
import { compilePopulatePrompt } from '../src/modules/item/infrastructure/utils/compile-populate-prompt.util';
import { mergePopulateResultsForTests } from '../src/modules/item/infrastructure/utils/run-metadata-populate-strategy.util';
import { parsePopulateJson } from '../src/modules/item/infrastructure/utils/parse-populate-json.util';
import { PopulateJsonValidationError } from '../src/modules/item/infrastructure/errors/populate-json-validation.error';
import {
  buildPopulateRepairPrompt,
  resolveTruncationRetryMaxTokens,
} from '../src/modules/item/infrastructure/utils/populate-retry.util';
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

describe('parsePopulateJson failure kinds', () => {
  test('flags an unclosed object as truncated', () => {
    expect(() => parsePopulateJson('{"Title":"Widget","Description":"A long desc')).toThrow(
      PopulateJsonValidationError
    );
    try {
      parsePopulateJson('{"Title":"Widget","Description":"A long desc');
    } catch (err) {
      expect((err as PopulateJsonValidationError).kind).toBe('truncated');
    }
  });

  test('flags balanced but invalid JSON as malformed', () => {
    try {
      parsePopulateJson('{"Title": Widget}');
      throw new Error('expected parse failure');
    } catch (err) {
      expect(err).toBeInstanceOf(PopulateJsonValidationError);
      expect((err as PopulateJsonValidationError).kind).toBe('malformed');
    }
  });

  test('flags an empty reply as empty', () => {
    try {
      parsePopulateJson('   ');
      throw new Error('expected parse failure');
    } catch (err) {
      expect((err as PopulateJsonValidationError).kind).toBe('empty');
    }
  });
});

describe('populate retry helpers', () => {
  test('raises max tokens by the multiplier and caps it', () => {
    expect(resolveTruncationRetryMaxTokens(1000)).toBe(1500);
    expect(resolveTruncationRetryMaxTokens(null)).toBe(3072);
    expect(resolveTruncationRetryMaxTokens(1_000_000)).toBe(16_384);
  });

  test('repair prompt echoes the previous reply, capped', () => {
    const err = new PopulateJsonValidationError('bad', { kind: 'malformed' });
    const prompt = buildPopulateRepairPrompt('BASE', err, 'x'.repeat(5000));
    expect(prompt.startsWith('BASE')).toBe(true);
    expect(prompt).toContain('Previous response:');
    expect(prompt.length).toBeLessThan(2_400);
  });
});

describe('runMetadataPopulateStrategy retry', () => {
  const validReply = JSON.stringify({
    Title: 'Widget',
    Price: 9.99,
    Description: 'A widget.',
    Color: null,
    Size: null,
    ImageUrl: null,
    PredefinedFields: {},
    UserDefinedFields: {},
  });

  const config: MetadataPopulatorConfig = {
    provider: 'local',
    apiKey: '',
    model: 'test',
    endpoint: 'http://localhost',
    customPrompt: '',
    extractionOptions: resolveAiMetadataExtractionOptions({
      AiMetadataExtractionPreset: 'balanced',
    }),
  };

  async function loadStrategy(
    replies: Array<{ text: string; finishReason?: string }>,
    calls: Array<{ prompt: string; maxTokens?: number }>
  ) {
    mock.module('../src/modules/item/infrastructure/utils/ai-text-completion.util', () => ({
      completeTextPromptStream: async (prompt: string, cfg: { maxTokens?: number }) => {
        calls.push({ prompt, maxTokens: cfg.maxTokens });
        const reply = replies[calls.length - 1] ?? replies[replies.length - 1]!;
        return { text: reply.text, usage: {}, finishReason: reply.finishReason };
      },
      completeTextPrompt: async () => '',
    }));
    const mod = await import(
      `../src/modules/item/infrastructure/utils/run-metadata-populate-strategy.util.ts?retry=${Math.random()}`
    );
    return mod.runMetadataPopulateStrategy as typeof import('../src/modules/item/infrastructure/utils/run-metadata-populate-strategy.util').runMetadataPopulateStrategy;
  }

  test('truncated first reply retries with raised max tokens and succeeds', async () => {
    const calls: Array<{ prompt: string; maxTokens?: number }> = [];
    const run = await loadStrategy(
      [{ text: '{"Title":"Widget","Descr', finishReason: 'length' }, { text: validReply }],
      calls
    );

    const result = await run(baseInput, config);

    expect(result.title).toBe('Widget');
    expect(calls).toHaveLength(2);
    expect(calls[1]!.prompt).toContain('cut off');
    expect(calls[1]!.maxTokens).toBeGreaterThan(calls[0]!.maxTokens ?? 0);
  });

  test('malformed first reply retries with a repair prompt that includes the prior output', async () => {
    const calls: Array<{ prompt: string; maxTokens?: number }> = [];
    const run = await loadStrategy(
      [{ text: '{"Title": Widget}', finishReason: 'stop' }, { text: validReply }],
      calls
    );

    const result = await run(baseInput, config);

    expect(result.title).toBe('Widget');
    expect(calls).toHaveLength(2);
    expect(calls[1]!.prompt).toContain('{"Title": Widget}');
    expect(calls[1]!.maxTokens).toBe(calls[0]!.maxTokens);
  });

  test('throws PopulateJsonValidationError when both attempts are invalid', async () => {
    const calls: Array<{ prompt: string; maxTokens?: number }> = [];
    const run = await loadStrategy([{ text: 'not json at all' }], calls);

    await expect(run(baseInput, config)).rejects.toBeInstanceOf(PopulateJsonValidationError);
    expect(calls).toHaveLength(2);
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
