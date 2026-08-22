import { describe, expect, test } from 'bun:test';
import { GetFieldDefinitionsUseCase } from '../src/modules/item/application/get-field-definitions.use-case';
import type { FieldDefinition } from '../src/modules/item/domain/item-field.entity';
import type { ItemFieldRepository } from '../src/modules/item/domain/ports/item-field.repository';
import type { ServerConfigRepository } from '../src/modules/system/domain/ports/server-config.repository';

const MODEL_NUMBER: FieldDefinition = {
  Id: 'db-model-number',
  Category: 'tech',
  FieldKey: 'ModelNumber',
  Label: 'Model / Version',
  Placeholder: 'e.g. iPhone 15 Pro',
  DisplayOrder: 1,
  Dependencies: [],
};

function createFieldRepo(definitions: FieldDefinition[]): ItemFieldRepository {
  return {
    findDefinitionsByCategory: async () => definitions.map((definition) => ({ ...definition })),
    findDependenciesByFieldIds: async () => [],
  };
}

function createConfigRepo(
  enabledPackIds: string[],
  customPacks: unknown[] = []
): ServerConfigRepository {
  return {
    load: () =>
      ({
        AiEnabledPackIds: enabledPackIds,
        AiCustomPacks: customPacks,
      }) as never,
  } as ServerConfigRepository;
}

describe('GetFieldDefinitionsUseCase pack merge', () => {
  test('tech + CPU installed includes Cores and Socket after DB keys', async () => {
    const useCase = new GetFieldDefinitionsUseCase(
      createFieldRepo([MODEL_NUMBER]),
      createConfigRepo(['technology', 'technology.cpu'])
    );
    const defs = await useCase.execute('tech');
    const keys = defs.map((definition) => definition.FieldKey);
    expect(keys).toContain('ModelNumber');
    expect(keys).toContain('Cores');
    expect(keys).toContain('Socket');
    expect(defs.find((definition) => definition.FieldKey === 'Cores')?.Id).toBe(
      'pack:technology.cpu:Cores'
    );
    expect(defs.find((definition) => definition.FieldKey === 'Cores')?.Placeholder).toBe(
      'physical core count'
    );
  });

  test('empty pack ids keep only DB keys', async () => {
    const useCase = new GetFieldDefinitionsUseCase(
      createFieldRepo([MODEL_NUMBER]),
      createConfigRepo([])
    );
    const defs = await useCase.execute('tech');
    expect(defs.map((definition) => definition.FieldKey)).toEqual(['ModelNumber']);
  });

  test('clothing category does not receive CPU fields', async () => {
    const pants: FieldDefinition = {
      Id: 'db-pants',
      Category: 'clothing',
      FieldKey: 'PantsSize',
      Label: 'Pants Size',
      Placeholder: null,
      DisplayOrder: 1,
      Dependencies: [],
    };
    const useCase = new GetFieldDefinitionsUseCase(
      createFieldRepo([pants]),
      createConfigRepo(['technology', 'technology.cpu'])
    );
    const defs = await useCase.execute('clothing');
    expect(defs.map((definition) => definition.FieldKey)).toEqual(['PantsSize']);
  });

  test('skips pack keys that already exist in DB defs', async () => {
    const leftoverCores: FieldDefinition = {
      Id: 'db-cores',
      Category: 'tech',
      FieldKey: 'Cores',
      Label: 'Cores',
      Placeholder: 'from db',
      DisplayOrder: 2,
      Dependencies: [],
    };
    const useCase = new GetFieldDefinitionsUseCase(
      createFieldRepo([MODEL_NUMBER, leftoverCores]),
      createConfigRepo(['technology', 'technology.cpu'])
    );
    const defs = await useCase.execute('tech');
    const cores = defs.filter((definition) => definition.FieldKey === 'Cores');
    expect(cores).toHaveLength(1);
    expect(cores[0].Id).toBe('db-cores');
  });

  test('always-on custom pack fields appear for any category', async () => {
    const useCase = new GetFieldDefinitionsUseCase(
      createFieldRepo([MODEL_NUMBER]),
      createConfigRepo(['custom.books'], [
        {
          Id: 'custom.books',
          Label: 'Books',
          Description: '',
          Match: { Categories: [] },
          Fields: [{ Key: 'Binding', Label: 'Binding', Bucket: 'userDefined', Hint: 'hardcover' }],
          PromptFragment: 'Book rules.',
        },
      ])
    );
    const defs = await useCase.execute('clothing');
    expect(defs.map((definition) => definition.FieldKey)).toContain('Binding');
    expect(defs.find((definition) => definition.FieldKey === 'Binding')?.Id).toBe(
      'pack:custom.books:Binding'
    );
  });
});
