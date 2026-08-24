import { describe, expect, test } from 'bun:test';
import type { Item } from '@/modules/item/domain/item.entity';
import { resolveItemMetadata } from '@/modules/item/domain/resolve-item-metadata.util';

function baseItem(overrides: Partial<Item> = {}): Item {
  return {
    Id: 'item-1',
    ListId: 'list-1',
    PriorityId: null,
    SuggestedByUserId: null,
    Name: 'Gadget',
    Description: null,
    IsHiddenIdea: false,
    Category: 'electronics',
    ...overrides,
  };
}

describe('resolveItemMetadata', () => {
  test('falls back to description JSON CustomFields when column maps are empty', () => {
    const legacy = JSON.stringify({
      Text: 'Legacy notes',
      IsFavorite: true,
      CustomFields: {
        Predefined: { Color: 'Blue' },
        UserDefined: { Brand: 'Acme' },
      },
    });

    const metadata = resolveItemMetadata(
      baseItem({
        Description: legacy,
        CustomFields: { Predefined: {}, UserDefined: {} },
      })
    );

    expect(metadata).toMatchObject({
      Text: 'Legacy notes',
      IsFavorite: true,
      CustomFields: {
        Predefined: { Color: 'Blue' },
        UserDefined: { Brand: 'Acme' },
      },
    });
  });

  test('prefers non-empty column CustomFields over legacy description JSON', () => {
    const legacy = JSON.stringify({
      Text: 'Legacy notes',
      CustomFields: {
        Predefined: { Color: 'Blue' },
        UserDefined: { Brand: 'Acme' },
      },
    });

    const metadata = resolveItemMetadata(
      baseItem({
        Description: legacy,
        CustomFields: {
          Predefined: { Color: 'Green' },
          UserDefined: { Material: 'Cotton' },
        },
      })
    );

    expect(metadata).toMatchObject({
      Text: 'Legacy notes',
      CustomFields: {
        Predefined: { Color: 'Green' },
        UserDefined: { Material: 'Cotton' },
      },
    });
  });
});
