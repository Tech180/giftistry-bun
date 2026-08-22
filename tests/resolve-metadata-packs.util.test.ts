import { describe, expect, test } from 'bun:test';
import type { MetadataPack } from '../src/modules/system/domain/packs/metadata-pack.interface';
import { METADATA_PACKS_CATALOG } from '../src/modules/system/domain/packs/metadata-packs.catalog';
import { resolveMetadataPacks } from '../src/modules/system/domain/packs/resolve-metadata-packs.util';
import { sanitizeEnabledPackIds } from '../src/modules/system/domain/packs/sanitize-enabled-pack-ids.util';

const CPU_TITLE = 'AMD Ryzen 5 5600X 6-core Processor';

describe('sanitizeEnabledPackIds', () => {
  test('defaults to Technology + CPU when unset', () => {
    expect(sanitizeEnabledPackIds(undefined)).toEqual(['technology', 'technology.cpu']);
    expect(sanitizeEnabledPackIds(null)).toEqual(['technology', 'technology.cpu']);
  });

  test('keeps an explicit empty list', () => {
    expect(sanitizeEnabledPackIds([])).toEqual([]);
  });

  test('strips unknown ids and dedupes', () => {
    expect(
      sanitizeEnabledPackIds(['technology.cpu', 'nope', 'technology.cpu', 'technology'])
    ).toEqual(['technology.cpu', 'technology']);
  });
});

describe('resolveMetadataPacks', () => {
  test('returns nothing when no packs are enabled', () => {
    const packs = resolveMetadataPacks({
      enabledPackIds: [],
      category: 'tech',
      itemName: CPU_TITLE,
    });
    expect(packs).toEqual([]);
  });

  test('matches CPU pack by tech category when enabled', () => {
    const packs = resolveMetadataPacks({
      enabledPackIds: ['technology', 'technology.cpu'],
      category: 'tech',
      itemName: 'Some gadget',
    });
    expect(packs.map((pack) => pack.id)).toEqual(['technology.cpu']);
  });

  test('matches CPU pack by title keywords when category is unrelated', () => {
    const packs = resolveMetadataPacks({
      enabledPackIds: ['technology.cpu'],
      category: 'clothing',
      itemName: CPU_TITLE,
    });
    expect(packs.map((pack) => pack.id)).toEqual(['technology.cpu']);
  });

  test('prefers a matching child over the parent', () => {
    const packs = resolveMetadataPacks({
      enabledPackIds: ['technology', 'technology.cpu'],
      category: 'electronics',
      itemName: CPU_TITLE,
    });
    expect(packs.map((pack) => pack.id)).toEqual(['technology.cpu']);
  });

  test('injects parent when enabled and no child matches', () => {
    const catalog: MetadataPack[] = [
      {
        ...METADATA_PACKS_CATALOG[0],
        match: { categories: ['tech'] },
        children: [
          {
            id: 'technology.cpu',
            label: 'CPU',
            description: 'CPU',
            match: { categories: ['cpu_only'] },
            fields: [],
            promptFragment: 'cpu',
          },
        ],
      },
    ];
    const packs = resolveMetadataPacks({
      enabledPackIds: ['technology', 'technology.cpu'],
      category: 'tech',
      itemName: 'USB hub',
      catalog,
    });
    expect(packs.map((pack) => pack.id)).toEqual(['technology']);
  });

  test('does not inject a child that is not enabled', () => {
    const packs = resolveMetadataPacks({
      enabledPackIds: ['technology'],
      category: 'tech',
      itemName: CPU_TITLE,
    });
    expect(packs.map((pack) => pack.id)).toEqual(['technology']);
  });

  test('sorts more specific children before a matching sibling', () => {
    const packs = resolveMetadataPacks({
      enabledPackIds: ['technology', 'technology.cpu', 'technology.computer-parts'],
      category: 'tech',
      itemName: CPU_TITLE,
    });
    expect(packs.map((pack) => pack.id)).toEqual([
      'technology.cpu',
      'technology.computer-parts',
    ]);
  });

  test('does not match CPU on an unrelated category without title keywords', () => {
    const packs = resolveMetadataPacks({
      enabledPackIds: ['technology.cpu'],
      category: 'clothing',
      itemName: 'A sweater',
    });
    expect(packs.map((pack) => pack.id)).toEqual([]);
  });

  test('injects an enabled custom pack with empty match', () => {
    const custom = {
      id: 'custom.books',
      label: 'Books',
      description: 'Books',
      match: { categories: [] },
      fields: [],
      promptFragment: 'Book rules.',
    };
    const packs = resolveMetadataPacks({
      enabledPackIds: ['custom.books'],
      category: 'clothing',
      itemName: 'A sweater',
      catalog: [...METADATA_PACKS_CATALOG, custom],
    });
    expect(packs.map((pack) => pack.id)).toEqual(['custom.books']);
  });

  test('does not inject a disabled custom pack with empty match', () => {
    const custom = {
      id: 'custom.books',
      label: 'Books',
      description: 'Books',
      match: { categories: [] },
      fields: [],
      promptFragment: 'Book rules.',
    };
    const packs = resolveMetadataPacks({
      enabledPackIds: [],
      category: 'books',
      itemName: 'A novel',
      catalog: [...METADATA_PACKS_CATALOG, custom],
    });
    expect(packs.map((pack) => pack.id)).toEqual([]);
  });
});
