import { describe, expect, test } from 'bun:test';
import { sortWishlistItemsByExportOrder } from '../src/modules/item/domain/sort-wishlist-items.util';
import { computeItemClaimSummary } from '../src/modules/item/domain/compute-item-claim-summary.util';
import { resolveCategoryPresentation } from '../src/modules/item/domain/format-category-label.util';

describe('sortWishlistItemsByExportOrder', () => {
  test('orders by category, favorite, then priority', () => {
    const sorted = sortWishlistItemsByExportOrder([
      { Name: 'Zed', Category: 'home_kitchen', Priority: 2, Metadata: null },
      { Name: 'Fav', Category: 'home_kitchen', Priority: 5, Metadata: { IsFavorite: true } },
      { Name: 'Alpha', Category: 'apparel_accessories', Priority: 1, Metadata: null },
      { Name: 'Other', Category: 'uncategorized', Priority: 1, Metadata: null },
    ]);

    expect(sorted.map((i) => i.Name)).toEqual(['Alpha', 'Fav', 'Zed', 'Other']);
  });
});

describe('computeItemClaimSummary', () => {
  test('marks multi-count fully claimed by quantity', () => {
    const summary = computeItemClaimSummary({
      metadata: { Text: null, MultiCount: true, DesiredQuantity: 3 },
      claims: [
        { Id: '1', ItemId: 'i', UserId: 'u', Amount: null, ClaimedByName: null, Quantity: 2 },
        { Id: '2', ItemId: 'i', UserId: 'u2', Amount: null, ClaimedByName: null, Quantity: 1 },
      ],
      links: [],
      allowGroupFunds: false,
    });

    expect(summary.IsMultiCount).toBe(true);
    expect(summary.IsFullyClaimed).toBe(true);
    expect(summary.TotalClaimedQuantity).toBe(3);
    expect(summary.RemainingQuantity).toBe(0);
  });

  test('uses funding target when group funds enabled', () => {
    const summary = computeItemClaimSummary({
      metadata: { Text: null },
      claims: [
        { Id: '1', ItemId: 'i', UserId: 'u', Amount: 40, ClaimedByName: null },
      ],
      links: [
        {
          Id: 'l',
          ItemId: 'i',
          Url: 'https://example.com',
          RetailerName: null,
          ExtractedPrice: 100,
          ExtractedImageUrl: null,
        } as any,
      ],
      allowGroupFunds: true,
    });

    expect(summary.FundingTarget).toBe(100);
    expect(summary.TotalClaimedAmount).toBe(40);
    expect(summary.IsFullyClaimed).toBe(false);
  });

  test('hides claim summary for owner pre-expiry', () => {
    const summary = computeItemClaimSummary({
      metadata: { Text: null, MultiCount: true, DesiredQuantity: 2 },
      claims: [
        { Id: '1', ItemId: 'i', UserId: 'u', Amount: null, ClaimedByName: null, Quantity: 2 },
      ],
      links: [],
      allowGroupFunds: false,
      hideClaims: true,
    });

    expect(summary.IsFullyClaimed).toBe(false);
    expect(summary.TotalClaimedQuantity).toBe(0);
  });
});

describe('resolveCategoryPresentation', () => {
  test('returns friendly label for standard category', () => {
    expect(resolveCategoryPresentation('home_kitchen')).toEqual({
      CategoryKey: 'home_kitchen',
      CategoryLabel: 'Home & Kitchen',
    });
  });

  test('maps empty to general items', () => {
    expect(resolveCategoryPresentation('')).toEqual({
      CategoryKey: 'uncategorized',
      CategoryLabel: 'General Items',
    });
  });
});
