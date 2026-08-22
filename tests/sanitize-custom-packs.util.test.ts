import { describe, expect, test } from 'bun:test';
import { catalogForConfig } from '../src/modules/system/domain/packs/catalog-for-config.util';
import { mergeMetadataPackCatalog } from '../src/modules/system/domain/packs/merge-metadata-pack-catalog.util';
import { METADATA_PACKS_CATALOG } from '../src/modules/system/domain/packs/metadata-packs.catalog';
import { sanitizeCustomPacks } from '../src/modules/system/domain/packs/sanitize-custom-packs.util';
import { sanitizeEnabledPackIds } from '../src/modules/system/domain/packs/sanitize-enabled-pack-ids.util';

const validCustom = {
  Id: 'custom.books',
  Label: 'Books',
  Description: 'Book specs',
  Match: { Categories: [] },
  Fields: [{ Key: 'Binding', Label: 'Binding', Bucket: 'userDefined', Hint: 'hardcover or paperback' }],
  PromptFragment: 'Extract binding.',
};

describe('sanitizeCustomPacks', () => {
  test('keeps a valid custom pack', () => {
    const packs = sanitizeCustomPacks([validCustom]);
    expect(packs).toHaveLength(1);
    expect(packs[0].id).toBe('custom.books');
    expect(packs[0].fields[0].key).toBe('Binding');
  });

  test('drops bad ids, built-in collisions, and duplicate field keys', () => {
    const packs = sanitizeCustomPacks([
      { ...validCustom, Id: 'technology' },
      { ...validCustom, Id: 'not-custom' },
      {
        ...validCustom,
        Id: 'custom.dup',
        Fields: [
          { Key: 'Binding', Label: 'Binding', Bucket: 'userDefined' },
          { Key: 'Binding', Label: 'Also binding', Bucket: 'predefined' },
        ],
      },
      validCustom,
      validCustom,
    ]);
    expect(packs.map((pack) => pack.id)).toEqual(['custom.dup', 'custom.books']);
    expect(packs[0].fields).toHaveLength(1);
  });

  test('returns empty for non-arrays', () => {
    expect(sanitizeCustomPacks(undefined)).toEqual([]);
    expect(sanitizeCustomPacks(null)).toEqual([]);
  });
});

describe('sanitizeEnabledPackIds with merged catalog', () => {
  test('keeps custom.books when the merged catalog includes it', () => {
    const custom = sanitizeCustomPacks([validCustom]);
    const catalog = mergeMetadataPackCatalog(METADATA_PACKS_CATALOG, custom);
    expect(
      sanitizeEnabledPackIds(['technology', 'custom.books', 'nope'], catalog)
    ).toEqual(['technology', 'custom.books']);
  });

  test('catalogForConfig appends sanitized custom packs as roots', () => {
    const catalog = catalogForConfig({ AiCustomPacks: [validCustom] });
    expect(catalog.some((pack) => pack.id === 'custom.books')).toBe(true);
    expect(catalog.some((pack) => pack.id === 'technology')).toBe(true);
  });
});
