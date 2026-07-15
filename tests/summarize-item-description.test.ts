import { describe, expect, mock, test } from 'bun:test';
import {
  compileDescriptionPrompt,
  formatItemContextBlock,
} from '../src/modules/item/infrastructure/gemini-description-summarizer';
import { SummarizeItemDescriptionUseCase } from '../src/modules/item/application/summarize-item-description.use-case';
import { AppError } from '../src/common/middlewares/error.middleware';
import type { ServerConfigRepository } from '../src/modules/system/domain/ports/server-config.repository';

const configRepo = {
  load: () => ({
    AiEnabled: true,
    AiFastProvider: 'openrouter',
    AiFastApiKey: 'test-key',
    AiFastModel: '',
    AiIntelligentProvider: 'openrouter',
    AiIntelligentApiKey: 'test-key',
    AiIntelligentModel: '',
    AiDescriptionPrompt: '',
    AiFastEndpoint: '',
    AiIntelligentEndpoint: '',
  }),
} as unknown as ServerConfigRepository;

describe('compileDescriptionPrompt', () => {
  test('replaces description prompt tokens', () => {
    const prompt = compileDescriptionPrompt(
      'Name={itemName}; Cat={category}; Notes={existingNotes}; Context={itemContext}',
      {
        itemName: 'Cool Tee',
        category: 'clothing',
        existingNotes: 'Old note',
        itemContext: 'ShirtSize: L',
      }
    );

    expect(prompt).toContain('Name=Cool Tee');
    expect(prompt).toContain('Cat=clothing');
    expect(prompt).toContain('Notes=Old note');
    expect(prompt).toContain('Context=ShirtSize: L');
  });
});

describe('formatItemContextBlock', () => {
  test('formats CustomFields and variations', () => {
    const block = formatItemContextBlock({
      priority: 2,
      desiredQuantity: 3,
      customFields: {
        Predefined: { ShirtSize: 'L', Color: 'Black' },
        UserDefined: { Fit: 'Regular' },
      },
      variations: [{ Name: 'Blue', Quantity: 2 }],
    });

    expect(block).toContain('Priority: 2');
    expect(block).toContain('Desired Quantity: 3');
    expect(block).toContain('ShirtSize: L');
    expect(block).toContain('Fit: Regular');
    expect(block).toContain('Blue: 2');
  });
});

describe('SummarizeItemDescriptionUseCase', () => {
  const baseInput = {
    listId: 'list-1',
    name: 'Test Item',
    text: 'Existing notes',
  };

  test('rejects when list AI is disabled', async () => {
    const useCase = new SummarizeItemDescriptionUseCase(
      { findById: async () => ({ Id: 'list-1', UserId: 'owner-1', AiEnabled: false }) } as any,
      { findById: async () => ({ Id: 'user-1', AiEnabled: true }) } as any,
      { execute: async () => undefined } as any,
      { summarize: async () => 'summary' } as any,
      configRepo
    );

    await expect(useCase.execute('user-1', baseInput)).rejects.toThrow(
      new AppError('AI features are disabled for this wishlist', 403, 'FORBIDDEN')
    );
  });

  test('rejects when user AI is disabled on profile', async () => {
    const useCase = new SummarizeItemDescriptionUseCase(
      { findById: async () => ({ Id: 'list-1', UserId: 'owner-1', AiEnabled: true }) } as any,
      { findById: async () => ({ Id: 'user-1', AiEnabled: false }) } as any,
      { execute: async () => undefined } as any,
      { summarize: async () => 'summary' } as any,
      configRepo
    );

    await expect(useCase.execute('user-1', baseInput)).rejects.toThrow(
      new AppError('AI features are disabled on your profile', 403, 'FORBIDDEN')
    );
  });

  test('returns summarized text on happy path with CustomFields', async () => {
    const summarize = mock(async () => 'Generated notes paragraph.');
    const useCase = new SummarizeItemDescriptionUseCase(
      { findById: async () => ({ Id: 'list-1', UserId: 'owner-1', AiEnabled: true }) } as any,
      {
        findById: async (id: string) =>
          id === 'user-1'
            ? { Id: 'user-1', AiEnabled: true }
            : { Id: 'owner-1', AiEnabled: true },
      } as any,
      { execute: async () => undefined } as any,
      { summarize } as any,
      configRepo
    );

    const result = await useCase.execute('user-1', {
      ...baseInput,
      customFields: {
        Predefined: { ShirtSize: 'L' },
        UserDefined: { Fit: 'Regular' },
      },
    });

    expect(result).toBe('Generated notes paragraph.');
    expect(summarize).toHaveBeenCalled();
  });
});
