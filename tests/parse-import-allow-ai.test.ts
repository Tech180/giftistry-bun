import { describe, expect, mock, test } from 'bun:test';
import { AppError } from '../src/common/domain/errors/app-error';
import { ParseImportPreviewUseCase } from '../src/modules/item/slices/import/use-cases/parse-import-preview.use-case';
import type { ImportFileTextExtractorInput } from '@/modules/item/domain/interfaces/import-file-text-extractor-input.interface';

function buildUseCase(overrides: {
  extractText?: string;
  extractFormat?: 'txt' | 'json' | 'csv' | 'xlsx';
  parse?: ReturnType<typeof mock>;
  extract?: ReturnType<typeof mock>;
} = {}) {
  const parse =
    overrides.parse ??
    mock(() => {
      throw new Error('AI parse should not run');
    });

  const extract =
    overrides.extract ??
    mock(async (_input: ImportFileTextExtractorInput) => ({
      text: overrides.extractText ?? 'not a giftistry export — just freeform notes',
      format: overrides.extractFormat ?? 'txt',
      warnings: [],
      truncated: false,
    }));

  const useCase = new ParseImportPreviewUseCase(
    { extract } as never,
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

  return { useCase, parse, extract };
}

describe('ParseImportPreviewUseCase allowAi', () => {
  test('rejects unstructured files when allowAi is false without calling AI', async () => {
    const { useCase, parse } = buildUseCase();

    try {
      await useCase.execute('user-1', {
        fileName: 'notes.txt',
        format: 'txt',
        content: 'hello',
        contentEncoding: 'text',
        allowAi: false,
      });
      throw new Error('expected failure');
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).errorCode).toBe('IMPORT_FORMAT_UNSUPPORTED');
      expect((err as AppError).message).toContain('Giftistry export');
    }

    expect(parse).not.toHaveBeenCalled();
  });

  test('still parses Giftistry JSON without AI when allowAi is false', async () => {
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

    const { useCase, parse } = buildUseCase({
      extractText: giftistryJson,
      extractFormat: 'json',
    });

    const result = await useCase.execute('user-1', {
      fileName: 'holiday.json',
      format: 'json',
      content: giftistryJson,
      contentEncoding: 'text',
      allowAi: false,
    });

    expect(result.parseMode).toBe('deterministic');
    expect(result.items).toHaveLength(1);
    expect(result.items[0].name).toBe('Mug');
    expect(parse).not.toHaveBeenCalled();
  });

  test('parses Giftistry XLSX tabular text without AI when allowAi is false', async () => {
    const tabular = [
      '# Sheet: Wishlist',
      'Category\tPriority\tItem\tStar\tPrice\tWebsite\tDescription\tAudience\tSuggestion',
      'Home:\t\t\t\t\t\t\t\t',
      '\t1\tMug\t\t\t\tCeramic\t\t',
    ].join('\n');

    const { useCase, parse, extract } = buildUseCase({
      extractText: tabular,
      extractFormat: 'xlsx',
    });

    const result = await useCase.execute('user-1', {
      fileName: 'holiday.xlsx',
      format: 'xlsx',
      content: 'data-url',
      contentEncoding: 'data-url',
      allowAi: false,
    });

    expect(result.parseMode).toBe('deterministic');
    expect(result.sourceFormat).toBe('xlsx');
    expect(result.items).toHaveLength(1);
    expect(result.items[0].name).toBe('Mug');
    expect(parse).not.toHaveBeenCalled();
    expect(extract).toHaveBeenCalledTimes(2);
    expect(extract.mock.calls[0]?.[0]).toMatchObject({
      maxSheets: 1,
      maxRowsPerSheet: 16,
    });
    expect(extract.mock.calls[1]?.[0]).toMatchObject({ maxSheets: 1 });
    expect(extract.mock.calls[1]?.[0].maxRowsPerSheet).toBeUndefined();
  });

  test('rejects unstructured XLSX after probe only when allowAi is false', async () => {
    const extract = mock(async (input: ImportFileTextExtractorInput) => ({
      text: '# Sheet: Noise\nfoo\tbar\nbaz\tqux',
      format: 'xlsx' as const,
      warnings: [],
      truncated: false,
      _opts: input,
    }));
    const { useCase, parse } = buildUseCase({ extract });

    try {
      await useCase.execute('user-1', {
        fileName: 'random.xlsx',
        format: 'xlsx',
        content: 'data-url',
        contentEncoding: 'data-url',
        allowAi: false,
      });
      throw new Error('expected failure');
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).errorCode).toBe('IMPORT_FORMAT_UNSUPPORTED');
    }

    expect(parse).not.toHaveBeenCalled();
    expect(extract).toHaveBeenCalledTimes(1);
    expect(extract.mock.calls[0]?.[0]).toMatchObject({
      maxSheets: 1,
      maxRowsPerSheet: 16,
    });
  });

  test('parses Giftistry XLSX with second full-sheet extract when allowAi is false', async () => {
    const probe = [
      '# Sheet: Wishlist',
      'Category\tPriority\tItem\tStar\tPrice\tWebsite\tDescription\tAudience\tSuggestion',
    ].join('\n');
    const full = [
      probe,
      'Home:\t\t\t\t\t\t\t\t',
      '\t1\tMug\t\t\t\tCeramic\t\t',
      '\t2\tLamp\t\t\t\tDesk\t\t',
    ].join('\n');

    const extract = mock(async (input: ImportFileTextExtractorInput) => ({
      text: input.maxRowsPerSheet !== undefined ? probe : full,
      format: 'xlsx' as const,
      warnings: [],
      truncated: false,
    }));
    const { useCase, parse } = buildUseCase({ extract });

    const result = await useCase.execute('user-1', {
      fileName: 'holiday.xlsx',
      format: 'xlsx',
      content: 'data-url',
      contentEncoding: 'data-url',
      allowAi: false,
    });

    expect(result.parseMode).toBe('deterministic');
    expect(result.items).toHaveLength(2);
    expect(result.items.map((item) => item.name)).toEqual(['Mug', 'Lamp']);
    expect(parse).not.toHaveBeenCalled();
    expect(extract).toHaveBeenCalledTimes(2);
    expect(extract.mock.calls[1]?.[0]).toMatchObject({ maxSheets: 1 });
    expect(extract.mock.calls[1]?.[0].maxRowsPerSheet).toBeUndefined();
  });

  test('falls through to AI for unstructured XLSX when allowAi is true', async () => {
    const parse = mock(async () => ({
      items: [
        {
          name: 'Lamp',
          category: 'Home',
          priority: 1,
          isFavorite: false,
        },
      ],
      warnings: [],
    }));
    const extract = mock(async () => ({
      text: '# Sheet: Noise\nfoo\tbar',
      format: 'xlsx' as const,
      warnings: [],
      truncated: false,
    }));

    const useCase = new ParseImportPreviewUseCase(
      { extract } as never,
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
      fileName: 'random.xlsx',
      format: 'xlsx',
      content: 'data-url',
      contentEncoding: 'data-url',
      allowAi: true,
    });

    expect(result.parseMode).toBe('ai');
    expect(result.items[0]?.name).toBe('Lamp');
    expect(parse).toHaveBeenCalled();
    expect(extract).toHaveBeenCalledTimes(1);
    expect(extract.mock.calls[0]?.[0].maxSheets).toBeUndefined();
    expect(extract.mock.calls[0]?.[0].maxRowsPerSheet).toBeUndefined();
  });

  test('parses Giftistry TXT without AI when allowAi is false', async () => {
    const txt = [
      '============================================================',
      'WISHLIST REGISTRY: HOLIDAY',
      '============================================================',
      '',
      '[HOME]',
      '------',
      '  Mug (Priority: 1)',
      '    Description: Ceramic',
      '    Audience: Everyone',
    ].join('\n');

    const { useCase, parse } = buildUseCase({
      extractText: txt,
      extractFormat: 'txt',
    });

    const result = await useCase.execute('user-1', {
      fileName: 'holiday.txt',
      format: 'txt',
      content: txt,
      contentEncoding: 'text',
      allowAi: false,
    });

    expect(result.parseMode).toBe('deterministic');
    expect(result.sourceFormat).toBe('txt');
    expect(result.items).toHaveLength(1);
    expect(result.items[0].name).toBe('Mug');
    expect(parse).not.toHaveBeenCalled();
  });

  test('rejects PDF when allowAi is false without calling AI', async () => {
    const parse = mock(() => {
      throw new Error('AI parse should not run');
    });
    const useCase = new ParseImportPreviewUseCase(
      {
        extract: async () => ({
          text: '%PDF-1.4 binary-ish content',
          format: 'pdf',
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

    try {
      await useCase.execute('user-1', {
        fileName: 'catalog.pdf',
        format: 'pdf',
        content: 'base64data',
        contentEncoding: 'base64',
        allowAi: false,
      });
      throw new Error('expected failure');
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).errorCode).toBe('IMPORT_FORMAT_UNSUPPORTED');
    }

    expect(parse).not.toHaveBeenCalled();
  });
});
