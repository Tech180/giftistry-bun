import { describe, expect, test } from 'bun:test';
import { composePopulateWithPacks } from '../src/modules/system/domain/packs/compose-populate-with-packs.util';
import { METADATA_PACKS_CATALOG, findPackById } from '../src/modules/system/domain/packs/metadata-packs.catalog';
import { getDefaultAiPrompt } from '../src/modules/system/domain/prompts';

describe('composePopulateWithPacks', () => {
  test('returns the body unchanged when no packs are active', () => {
    expect(composePopulateWithPacks('Extract fields', [])).toBe('Extract fields');
    expect(composePopulateWithPacks('', [])).toBe('');
  });

  test('appends pack section with field keys and fragments', () => {
    const cpu = findPackById('technology.cpu');
    expect(cpu).toBeDefined();
    const composed = composePopulateWithPacks('Extract fields from {url}', [cpu!]);

    expect(composed.startsWith('Extract fields from {url}')).toBe(true);
    expect(composed).toContain('=== Metadata Packs ===');
    expect(composed).toContain('Active packs: CPU');
    expect(composed).toContain('PredefinedFields.Cores');
    expect(composed).toContain('PredefinedFields.Threads');
    expect(composed).toContain('PredefinedFields.Socket');
    expect(composed).toContain(cpu!.promptFragment);
  });

  test('uses the default populate prompt when the body is empty', () => {
    const parent = METADATA_PACKS_CATALOG[0];
    const composed = composePopulateWithPacks('   ', [parent]);
    expect(composed.startsWith(getDefaultAiPrompt('populate'))).toBe(true);
    expect(composed).toContain('=== Metadata Packs ===');
    expect(composed).toContain('Active packs: Technology');
  });

  test('appends technology parent and CPU with RAM and StorageCapacity', () => {
    const technology = findPackById('technology');
    const cpu = findPackById('technology.cpu');
    expect(technology).toBeDefined();
    expect(cpu).toBeDefined();
    const composed = composePopulateWithPacks('Extract fields', [technology!, cpu!]);

    expect(composed).toContain('Active packs: Technology / CPU');
    expect(composed).toContain('UserDefinedFields.RAM');
    expect(composed).toContain('PredefinedFields.StorageCapacity');
    expect(composed).toContain('6G+128G');
    expect(composed).toContain('PredefinedFields.Cores');
    expect(composed).toContain(technology!.promptFragment);
    expect(composed).toContain(cpu!.promptFragment);
  });

  test('appends a custom pack fragment and field lines', () => {
    const custom = {
      id: 'custom.books',
      label: 'Books',
      description: 'Books',
      match: { categories: [] },
      fields: [{ key: 'Binding', label: 'Binding', bucket: 'userDefined' as const, hint: 'hardcover' }],
      promptFragment: 'Extract the binding.',
    };
    const composed = composePopulateWithPacks('Extract fields', [custom]);
    expect(composed).toContain('Active packs: Books');
    expect(composed).toContain('UserDefinedFields.Binding');
    expect(composed).toContain('Extract the binding.');
  });
});
