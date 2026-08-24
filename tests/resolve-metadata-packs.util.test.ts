import { describe, expect, test } from 'bun:test';
import type { MetadataPack } from '../src/modules/system/domain/packs/metadata-pack.interface';
import {
  listCatalogPackIds,
  METADATA_PACKS_CATALOG,
} from '../src/modules/system/domain/packs/metadata-packs.catalog';
import { resolveMetadataPacks } from '../src/modules/system/domain/packs/resolve-metadata-packs.util';
import { sanitizeEnabledPackIds } from '../src/modules/system/domain/packs/sanitize-enabled-pack-ids.util';

const CPU_TITLE = 'AMD Ryzen 5 5600X 6-core Processor';

const DEFAULT_PACK_IDS = [
  'technology',
  'technology.cpu',
  'books',
  'movies',
  'clothing',
  'kitchen',
];

describe('sanitizeEnabledPackIds', () => {
  test('defaults to technology, CPU, and category packs when unset', () => {
    expect(sanitizeEnabledPackIds(undefined)).toEqual(DEFAULT_PACK_IDS);
    expect(sanitizeEnabledPackIds(null)).toEqual(DEFAULT_PACK_IDS);
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
    expect(packs.map((pack) => pack.id)).toEqual(['technology', 'technology.cpu']);
  });

  test('matches CPU pack by title keywords when category is unrelated', () => {
    const packs = resolveMetadataPacks({
      enabledPackIds: ['technology.cpu'],
      category: 'clothing',
      itemName: CPU_TITLE,
    });
    expect(packs.map((pack) => pack.id)).toEqual(['technology.cpu']);
  });

  test('co-injects enabled parent when a matching child wins', () => {
    const packs = resolveMetadataPacks({
      enabledPackIds: ['technology', 'technology.cpu'],
      category: 'electronics',
      itemName: CPU_TITLE,
    });
    expect(packs.map((pack) => pack.id)).toEqual(['technology', 'technology.cpu']);
  });

  test('does not co-inject parent when parent is not enabled', () => {
    const packs = resolveMetadataPacks({
      enabledPackIds: ['technology.cpu'],
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

  test('sorts ancestors before matching children', () => {
    const packs = resolveMetadataPacks({
      enabledPackIds: ['technology', 'technology.cpu', 'technology.computer-parts'],
      category: 'tech',
      itemName: CPU_TITLE,
    });
    expect(packs.map((pack) => pack.id)).toEqual([
      'technology',
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

  test('catalog includes books, movies, clothing, and kitchen packs', () => {
    const ids = listCatalogPackIds();
    expect(ids).toContain('books');
    expect(ids).toContain('movies');
    expect(ids).toContain('clothing');
    expect(ids).toContain('kitchen');
  });

  test('matches books pack by category and by title keyword', () => {
    expect(
      resolveMetadataPacks({
        enabledPackIds: ['books'],
        category: 'books',
        itemName: 'Some title',
      }).map((pack) => pack.id)
    ).toEqual(['books']);

    expect(
      resolveMetadataPacks({
        enabledPackIds: ['books'],
        category: 'home',
        itemName: 'The Women Hardcover Novel',
      }).map((pack) => pack.id)
    ).toEqual(['books']);
  });

  test('matches movies pack by category and by title keyword', () => {
    expect(
      resolveMetadataPacks({
        enabledPackIds: ['movies'],
        category: 'hobbies_entertainment',
        itemName: 'Encanto',
      }).map((pack) => pack.id)
    ).toEqual(['movies']);

    expect(
      resolveMetadataPacks({
        enabledPackIds: ['movies'],
        category: 'home',
        itemName: 'Disney Encanto 4K UHD',
      }).map((pack) => pack.id)
    ).toEqual(['movies']);
  });

  test('matches clothing pack by category and by title keyword', () => {
    expect(
      resolveMetadataPacks({
        enabledPackIds: ['clothing'],
        category: 'apparel_accessories',
        itemName: 'Solid French Terry Hoodie',
      }).map((pack) => pack.id)
    ).toEqual(['clothing']);

    expect(
      resolveMetadataPacks({
        enabledPackIds: ['clothing'],
        category: 'home',
        itemName: 'Boxy Full-Zip Hoodie',
      }).map((pack) => pack.id)
    ).toEqual(['clothing']);
  });

  test('matches kitchen pack by category and by title keyword', () => {
    expect(
      resolveMetadataPacks({
        enabledPackIds: ['kitchen'],
        category: 'home_kitchen',
        itemName: 'Cast iron pan',
      }).map((pack) => pack.id)
    ).toEqual(['kitchen']);

    expect(
      resolveMetadataPacks({
        enabledPackIds: ['kitchen'],
        category: 'clothing',
        itemName: '6 qt Dutch Oven',
      }).map((pack) => pack.id)
    ).toEqual(['kitchen']);
  });

  test('books and movies packs own Author and Format field definitions', () => {
    const books = METADATA_PACKS_CATALOG.find((pack) => pack.id === 'books');
    const movies = METADATA_PACKS_CATALOG.find((pack) => pack.id === 'movies');
    expect(books?.fields.some((field) => field.key === 'Author')).toBe(true);
    expect(movies?.fields.some((field) => field.key === 'Format')).toBe(true);
    expect(books?.promptFragment).toContain('Kristin Hannah The Women');
    expect(movies?.promptFragment).toContain('Disney Encanto 4K UHD');
  });

  test('technology parent owns RAM and StorageCapacity fields', () => {
    const technology = METADATA_PACKS_CATALOG.find((pack) => pack.id === 'technology');
    expect(technology?.fields.some((field) => field.key === 'RAM')).toBe(true);
    expect(technology?.fields.some((field) => field.key === 'StorageCapacity')).toBe(true);
    expect(technology?.promptFragment).toContain('6G+128G');
    expect(technology?.promptFragment).toContain('Oura Ring 5');
    expect(technology?.promptFragment).toContain('WH-1000XM5');
  });

  test('clothing pack owns apparel title examples', () => {
    const clothing = METADATA_PACKS_CATALOG.find((pack) => pack.id === 'clothing');
    expect(clothing?.promptFragment).toContain('Solid French Terry Boxy Full-Zip Hoodie');
    expect(clothing?.promptFragment).toContain('Classic Clog');
    expect(clothing?.promptFragment).toContain('MS52372');
    expect(clothing?.promptFragment).toContain("Women's");
  });
});
