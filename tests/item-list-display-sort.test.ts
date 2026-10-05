import { describe, expect, test } from 'bun:test';
import { sortWishlistItemsByExportOrder } from '../src/modules/item/domain/utils/sort-wishlist-items.util';
import { resolveItemListDisplayTier } from '../src/modules/item/domain/utils/resolve-item-list-display-tier.util';
import { ITEM_LIST_DISPLAY_TIER } from '../src/modules/item/domain/constants/item-list-display-tier.constant';

describe('resolveItemListDisplayTier', () => {
  test('classifies four tiers', () => {
    expect(
      resolveItemListDisplayTier({
        Name: 'a',
        Priority: 1,
        Metadata: { IsFavorite: true },
      })
    ).toBe(ITEM_LIST_DISPLAY_TIER.favoritedPriority);
    expect(
      resolveItemListDisplayTier({ Name: 'b', Priority: 1, Metadata: null })
    ).toBe(ITEM_LIST_DISPLAY_TIER.priorityOnly);
    expect(
      resolveItemListDisplayTier({
        Name: 'c',
        Metadata: { IsFavorite: true },
      })
    ).toBe(ITEM_LIST_DISPLAY_TIER.favoritedOnly);
    expect(resolveItemListDisplayTier({ Name: 'd', Metadata: null })).toBe(
      ITEM_LIST_DISPLAY_TIER.neither
    );
  });

  test('does not treat pinned as favorite for tiering', () => {
    expect(
      resolveItemListDisplayTier({
        Name: 'p',
        Metadata: { IsPinned: true },
      })
    ).toBe(ITEM_LIST_DISPLAY_TIER.neither);
  });
});

describe('sortWishlistItemsByExportOrder', () => {
  test('orders by category then four display tiers within category', () => {
    const sorted = sortWishlistItemsByExportOrder([
      { Name: 'Zed', Category: 'home_kitchen', Priority: 2, Metadata: null },
      {
        Name: 'FavPri',
        Category: 'home_kitchen',
        Priority: 5,
        Metadata: { IsFavorite: true },
      },
      { Name: 'Alpha', Category: 'apparel_accessories', Priority: 1, Metadata: null },
      { Name: 'Other', Category: 'uncategorized', Priority: 1, Metadata: null },
      {
        Name: 'FavOnly',
        Category: 'home_kitchen',
        Metadata: { IsFavorite: true },
      },
      { Name: 'PriOnly', Category: 'home_kitchen', Priority: 1, Metadata: null },
    ]);

    expect(sorted.map((i) => i.Name)).toEqual([
      'Alpha',
      'FavPri',
      'PriOnly',
      'Zed',
      'FavOnly',
      'Other',
    ]);
  });

  test('priority-only sorts above favorite-only within same category', () => {
    const sorted = sortWishlistItemsByExportOrder([
      { Name: 'FavOnly', Category: 'home_kitchen', Metadata: { IsFavorite: true } },
      { Name: 'PriOnly', Category: 'home_kitchen', Priority: 1, Metadata: null },
    ]);

    expect(sorted.map((i) => i.Name)).toEqual(['PriOnly', 'FavOnly']);
  });
});
