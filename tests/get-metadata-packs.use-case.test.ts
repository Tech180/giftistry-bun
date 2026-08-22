import { describe, expect, test } from 'bun:test';
import { GetMetadataPacksUseCase } from '../src/modules/system/application/get-metadata-packs.use-case';
import type { ServerConfigRepository } from '../src/modules/system/domain/ports/server-config.repository';

describe('GetMetadataPacksUseCase', () => {
  test('merges custom packs and marks them IsCustom', () => {
    const useCase = new GetMetadataPacksUseCase({
      load: () =>
        ({
          AiEnabledPackIds: ['technology.cpu', 'custom.books'],
          AiCustomPacks: [
            {
              Id: 'custom.books',
              Label: 'Books',
              Description: '',
              Match: { Categories: [] },
              Fields: [],
              PromptFragment: 'Book rules.',
            },
          ],
        }) as never,
    } as ServerConfigRepository);

    const result = useCase.execute();
    const custom = result.Catalog.find((pack) => pack.Id === 'custom.books');
    const technology = result.Catalog.find((pack) => pack.Id === 'technology');

    expect(custom?.IsCustom).toBe(true);
    expect(custom?.Match.Categories).toEqual([]);
    expect(technology?.IsCustom).toBe(false);
    expect(result.EnabledPackIds).toEqual(['technology.cpu', 'custom.books']);
  });
});
