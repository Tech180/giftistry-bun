import { describe, expect, test } from 'bun:test';
import { isItemPurchasedForRollover } from '../src/modules/wishlist/domain/is-item-purchased-for-rollover.util';

describe('isItemPurchasedForRollover', () => {
  test('returns false when there are no claims', () => {
    expect(isItemPurchasedForRollover([], [{ ExtractedPrice: 50 }], false)).toBe(false);
    expect(isItemPurchasedForRollover([], [{ ExtractedPrice: 50 }], true)).toBe(false);
  });

  test('returns true when any claim exists without group funds', () => {
    expect(
      isItemPurchasedForRollover(
        [{ Amount: null }],
        [{ ExtractedPrice: 50 }],
        false
      )
    ).toBe(true);
  });

  test('returns true for group funds when claimed amount meets price', () => {
    expect(
      isItemPurchasedForRollover(
        [{ Amount: 30 }, { Amount: 20 }],
        [{ ExtractedPrice: 40 }, { ExtractedPrice: 50 }],
        true
      )
    ).toBe(true);
  });

  test('returns false for group funds when claimed amount is under price', () => {
    expect(
      isItemPurchasedForRollover(
        [{ Amount: 10 }],
        [{ ExtractedPrice: 50 }],
        true
      )
    ).toBe(false);
  });

  test('falls back to any-claim when group funds but no price', () => {
    expect(
      isItemPurchasedForRollover([{ Amount: null }], [{ ExtractedPrice: null }], true)
    ).toBe(true);
    expect(isItemPurchasedForRollover([], [{ ExtractedPrice: 0 }], true)).toBe(false);
  });
});
