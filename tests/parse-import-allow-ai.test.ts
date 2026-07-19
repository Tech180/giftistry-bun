import { describe, expect, mock, test } from 'bun:test';
import { AppError } from '../src/common/middlewares/error.middleware';
import { ParseImportPreviewUseCase } from '../src/modules/item/application/parse-import-preview.use-case';

function buildUseCase(overrides: {
  extractText?: string;
  extractFormat?: 'txt' | 'json' | 'csv';
  parse?: ReturnType<typeof mock>;
} = {}) {
  const parse =
    overrides.parse ??
    mock(() => {
      throw new Error('AI parse should not run');
    });

  const useCase = new ParseImportPreviewUseCase(
    {
      extract: async () => ({
        text: overrides.extractText ?? 'not a giftistry export — just freeform notes',
        format: overrides.extractFormat ?? 'txt',
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

  return { useCase, parse };
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
