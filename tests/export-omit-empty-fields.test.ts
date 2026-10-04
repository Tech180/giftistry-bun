import { describe, expect, test } from 'bun:test';
import { GIFTISTRY_TABULAR_HEADERS } from '../src/modules/item/domain/constants/giftistry-csv-headers.constant';
import { toRelationExportItems } from '../src/modules/wishlist/slices/export/utils/to-relation-export-items.util';
import { buildWishlistCsvExport } from '../src/modules/wishlist/slices/export/utils/build-wishlist-csv-export.util';
import { buildWishlistJsonExport } from '../src/modules/wishlist/slices/export/utils/build-wishlist-json-export.util';
import { buildWishlistMdExport } from '../src/modules/wishlist/slices/export/utils/build-wishlist-md-export.util';
import { buildWishlistTxtExport } from '../src/modules/wishlist/slices/export/utils/build-wishlist-txt-export.util';

const exportContext = {
  exporterName: 'Ada Lovelace',
  isOwner: true,
  currentUserId: 'owner-1',
  listRole: 'owner' as const,
};

const collaboratorContext = {
  exporterName: 'Bob Collaborator',
  isOwner: false,
  currentUserId: 'collab-1',
  listRole: 'collaborator' as const,
};

const viewerContext = {
  exporterName: 'Vera Viewer',
  isOwner: false,
  currentUserId: 'viewer-1',
  listRole: 'viewer' as const,
};

const minimalItem = {
  Id: 'item-1',
  Name: 'Mug',
  Category: 'Kitchen',
  Priority: null,
  Description: '',
  isFav: false,
  Links: [],
  Metadata: { Text: '' },
};

const richItem = {
  Id: 'item-2',
  Name: 'Kettle',
  Category: 'Kitchen',
  Priority: 2,
  Description: 'Electric kettle',
  isFav: true,
  Links: [{ Url: 'https://shop.example/kettle', RetailerName: 'Shop', ExtractedPrice: 40 }],
  Metadata: { Text: 'Electric kettle', LinkedItemIds: ['item-1'] },
};

const suggestionItem = {
  Id: 'item-3',
  Name: 'Secret pick',
  Category: 'Fun',
  Priority: 1,
  Description: 'Nice gift',
  isFav: false,
  IsSuggestion: true,
  SuggestedByUsername: 'viewer-sam',
  Links: [],
  Metadata: { Text: 'Nice gift' },
};

describe('export omit empty fields', () => {
  test('tabular headers include suggestion but not audience', () => {
    expect(GIFTISTRY_TABULAR_HEADERS).not.toContain('Audience');
    expect(GIFTISTRY_TABULAR_HEADERS).toContain('Suggestion');
    expect(GIFTISTRY_TABULAR_HEADERS).toEqual([
      'Category',
      'Priority',
      'Item',
      'Star',
      'Price',
      'Website Link',
      'Description',
      'Suggestion',
      'Linked Items',
      'Related Items',
    ]);
  });

  test('minimal item omits empty optional fields in txt, md, and json', () => {
    const params = {
      wishlistTitle: 'Test List',
      items: [minimalItem],
      exportContext,
      relationItems: [],
      relationNameById: new Map<string, string>(),
    };

    const txt = buildWishlistTxtExport(params).data as string;
    expect(txt).not.toContain('Description:');
    expect(txt).not.toContain('Audience:');
    expect(txt).not.toContain('Suggestion:');
    expect(txt).not.toContain('Linked Items:');
    expect(txt).not.toContain('Related Items:');
    expect(txt).toContain('Mug');

    const md = buildWishlistMdExport(params).data as string;
    expect(md).not.toContain('- Favorite: no');
    expect(md).not.toContain('- Audience:');
    expect(md).not.toContain('- Suggestion:');
    expect(md).toContain('# Mug');

    const json = JSON.parse(buildWishlistJsonExport(params).data as string) as {
      items: Record<string, unknown>[];
    };
    expect(json.items[0]).toEqual({ name: 'Mug', category: 'Kitchen' });
  });

  test('rich item includes populated fields only for owner export', () => {
    const items = [richItem, minimalItem];
    const params = {
      wishlistTitle: 'Test List',
      items,
      exportContext,
      relationItems: toRelationExportItems(items),
      relationNameById: new Map([
        ['item-1', 'Mug'],
        ['item-2', 'Kettle'],
      ]),
    };

    const json = JSON.parse(buildWishlistJsonExport(params).data as string) as {
      items: Record<string, unknown>[];
    };
    const kettle = json.items.find((entry) => entry.name === 'Kettle');
    expect(kettle?.description).toBe('Electric kettle');
    expect(kettle?.priority).toBe(2);
    expect(kettle?.isFavorite).toBe(true);
    expect(kettle?.linkedItems).toEqual(['Mug']);
    expect(kettle).not.toHaveProperty('audience');
    expect(kettle).not.toHaveProperty('suggestion');

    const csv = buildWishlistCsvExport(params).data as string;
    const headerLine = csv.split('\r\n')[0];
    expect(headerLine).not.toContain('Audience');
    expect(headerLine).toContain('Suggestion');
  });

  test('collaborator export omits suggestion metadata for suggestion items', () => {
    const params = {
      wishlistTitle: 'Test List',
      items: [suggestionItem],
      exportContext: collaboratorContext,
      relationItems: [],
      relationNameById: new Map<string, string>(),
    };

    const txt = buildWishlistTxtExport(params).data as string;
    expect(txt).not.toContain('Suggestion:');
    expect(txt).not.toContain('viewer-sam');

    const json = JSON.parse(buildWishlistJsonExport(params).data as string) as {
      items: Record<string, unknown>[];
    };
    expect(json.items[0]).not.toHaveProperty('suggestion');
  });

  test('viewer export includes suggestion metadata when item is a suggestion', () => {
    const params = {
      wishlistTitle: 'Test List',
      items: [suggestionItem],
      exportContext: viewerContext,
      relationItems: [],
      relationNameById: new Map<string, string>(),
    };

    const txt = buildWishlistTxtExport(params).data as string;
    expect(txt).toContain('Suggestion: viewer-sam');

    const md = buildWishlistMdExport(params).data as string;
    expect(md).toContain('- Suggestion: viewer-sam');

    const json = JSON.parse(buildWishlistJsonExport(params).data as string) as {
      items: Record<string, unknown>[];
    };
    expect(json.items[0]?.suggestion).toBe('viewer-sam');
  });
});
