import { describe, expect, mock, test } from 'bun:test';
import { ParseImportPreviewUseCase } from '../src/modules/item/slices/import/use-cases/parse-import-preview.use-case';

describe('ParseImportPreviewUseCase progress', () => {
  test('emits reading → checking → found for deterministic Giftistry JSON', async () => {
    const giftistryJson = JSON.stringify({
      wishlistTitle: 'Holiday',
      exportedAt: '2026-07-12T12:00:00.000Z',
      items: [
        {
          name: 'Mug',
          category: 'Home',
          priority: 1,
          isFavorite: false,
          description: 'Ceramic',
          links: [],
        },
      ],
    });

    const parse = mock(() => {
      throw new Error('AI should not run');
    });
    const progress: Array<{ message: string; progressDone?: number }> = [];

    const useCase = new ParseImportPreviewUseCase(
      {
        extract: async () => ({
          text: giftistryJson,
          format: 'json',
          warnings: [],
        }),
      } as never,
      { parse } as never,
      { findById: async () => null } as never,
      { findByListId: async () => [] } as never,
      { findById: async () => ({ Id: 'u1', AiEnabled: true }) } as never,
      { execute: async () => undefined } as never,
      {
        load: () => ({
          AiEnabled: true,
          AiImportPrompt: '',
        }),
      } as never
    );

    const result = await useCase.execute(
      'user-1',
      {
        fileName: 'holiday.json',
        format: 'json',
        content: giftistryJson,
        contentEncoding: 'text',
        allowAi: false,
      },
      async (update) => {
        progress.push(update);
      }
    );

    expect(result.items).toHaveLength(1);
    expect(parse).not.toHaveBeenCalled();
    expect(progress.map((entry) => entry.message)).toEqual([
      'Reading file…',
      'Checking Giftistry format…',
      'Found 1 item',
    ]);
  });

  test('emits Asking AI progress then Found for AI parse path', async () => {
    const parse = mock(
      async (
        _input: unknown,
        _config: unknown,
        onProgress?: (progress: { tokensPerSecond: number | null }) => Promise<void>
      ) => {
        await onProgress?.({ tokensPerSecond: 42 });
        return {
          items: [
            {
              name: 'Lamp',
              category: 'Home',
              priority: 1,
              isFavorite: false,
            },
          ],
          warnings: [],
        };
      }
    );
    const progress: Array<{
      message: string;
      ProgressRate?: { Value: number; Unit: string } | null;
    }> = [];

    const useCase = new ParseImportPreviewUseCase(
      {
        extract: async () => ({
          text: 'freeform notes about a lamp',
          format: 'txt',
          warnings: [],
        }),
      } as never,
      { parse } as never,
      { findById: async () => null } as never,
      { findByListId: async () => [] } as never,
      { findById: async () => ({ Id: 'u1', AiEnabled: true }) } as never,
      { execute: async () => undefined } as never,
      {
        load: () => ({
          AiEnabled: true,
          AiImportPrompt: '',
          AiFastProvider: 'local',
          AiFastEndpoint: 'http://127.0.0.1:11434/v1',
          AiFastModel: 'llama3',
          AiFastApiKey: '',
        }),
      } as never
    );

    const result = await useCase.execute(
      'user-1',
      {
        fileName: 'notes.txt',
        format: 'txt',
        content: 'freeform notes about a lamp',
        contentEncoding: 'text',
        allowAi: true,
      },
      async (update) => {
        progress.push(update);
      }
    );

    expect(result.parseMode).toBe('ai');
    expect(result.items[0]?.name).toBe('Lamp');
    expect(progress.map((entry) => entry.message)).toEqual([
      'Reading file…',
      'Checking Giftistry format…',
      'Asking AI…',
      'Asking AI…',
      'Found 1 item',
    ]);
    expect(progress.some((entry) => entry.ProgressRate?.Value === 42)).toBe(true);
    expect(progress.some((entry) => entry.ProgressRate?.Unit === 'tok/s')).toBe(true);
    expect(progress.at(-1)?.ProgressRate).toBeNull();
  });

  test('merges parser chunk warnings with under-count warning', async () => {
    const parse = mock(async () => ({
      items: [
        {
          name: 'Lamp',
          category: 'Home',
          priority: 1,
          isFavorite: false,
        },
      ],
      warnings: ['1 of 3 AI import chunks failed; results may be incomplete.'],
    }));

    const useCase = new ParseImportPreviewUseCase(
      {
        extract: async () => {
          const lines = ['# Sheet: Main', 'Name\tLink'];
          for (let i = 0; i < 40; i++) {
            lines.push(`Gift ${i}\thttps://shop.example/p/${i}`);
          }
          return {
            text: lines.join('\n'),
            format: 'txt',
            warnings: [],
          };
        },
      } as never,
      { parse } as never,
      { findById: async () => null } as never,
      { findByListId: async () => [] } as never,
      { findById: async () => ({ Id: 'u1', AiEnabled: true }) } as never,
      { execute: async () => undefined } as never,
      {
        load: () => ({
          AiEnabled: true,
          AiImportPrompt: '',
          AiFastProvider: 'local',
          AiFastEndpoint: 'http://127.0.0.1:11434/v1',
          AiFastModel: 'llama3',
          AiFastApiKey: '',
        }),
      } as never
    );

    const result = await useCase.execute('user-1', {
      fileName: 'big.txt',
      format: 'txt',
      content: 'placeholder',
      contentEncoding: 'text',
      allowAi: true,
    });

    expect(result.warnings).toContain(
      '1 of 3 AI import chunks failed; results may be incomplete.'
    );
    expect(result.warnings.some((w) => w.includes('only 1 item'))).toBe(true);
  });
});
