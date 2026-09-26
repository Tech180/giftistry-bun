import { describe, expect, test } from 'bun:test';
import type { MetadataPack } from '../src/modules/system/domain/packs';
import { collectEnabledPackFieldsForCategory } from '../src/modules/system/domain/packs/utils/pack-field-definitions.util';

describe('collectEnabledPackFieldsForCategory', () => {
  test('includes CPU fields when technology and CPU packs are installed', () => {
    const fields = collectEnabledPackFieldsForCategory({
      enabledPackIds: ['technology', 'technology.cpu'],
      category: 'tech',
    });
    const keys = fields.map((entry) => entry.field.key);
    expect(keys).toContain('Cores');
    expect(keys).toContain('Socket');
    expect(fields.find((entry) => entry.field.key === 'Cores')?.packId).toBe('technology.cpu');
  });

  test('returns no pack fields when no packs are installed', () => {
    const fields = collectEnabledPackFieldsForCategory({
      enabledPackIds: [],
      category: 'tech',
    });
    expect(fields).toEqual([]);
  });

  test('does not attach CPU fields to clothing', () => {
    const fields = collectEnabledPackFieldsForCategory({
      enabledPackIds: ['technology', 'technology.cpu'],
      category: 'clothing',
    });
    expect(fields.map((entry) => entry.field.key)).not.toContain('Cores');
    expect(fields).toEqual([]);
  });

  test('ignores title keywords and matches only categories', () => {
    const fields = collectEnabledPackFieldsForCategory({
      enabledPackIds: ['technology.cpu'],
      category: 'clothing',
    });
    expect(fields).toEqual([]);
  });

  test('first enabled pack wins when two packs share a key', () => {
    const catalog: MetadataPack[] = [
      {
        id: 'first',
        label: 'First',
        description: 'First',
        match: { categories: ['tech'] },
        fields: [{ key: 'Socket', label: 'From first', bucket: 'predefined' }],
        promptFragment: '',
      },
      {
        id: 'second',
        label: 'Second',
        description: 'Second',
        match: { categories: ['tech'] },
        fields: [{ key: 'Socket', label: 'From second', bucket: 'predefined' }],
        promptFragment: '',
      },
    ];
    const fields = collectEnabledPackFieldsForCategory({
      enabledPackIds: ['first', 'second'],
      category: 'tech',
      catalog,
    });
    expect(fields).toEqual([
      {
        packId: 'first',
        field: { key: 'Socket', label: 'From first', bucket: 'predefined' },
      },
    ]);
  });
});
