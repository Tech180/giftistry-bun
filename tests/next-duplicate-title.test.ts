import { describe, expect, test } from 'bun:test';
import { nextDuplicateTitle } from '../src/modules/wishlist/domain/next-duplicate-title.util';

describe('nextDuplicateTitle', () => {
  test('appends (copy) when free', () => {
    expect(nextDuplicateTitle('Holiday', [])).toBe('Holiday (copy)');
  });

  test('increments when (copy) is taken', () => {
    expect(nextDuplicateTitle('Holiday', ['Holiday (copy)'])).toBe('Holiday (copy 2)');
  });

  test('skips occupied copy numbers', () => {
    expect(
      nextDuplicateTitle('Holiday', ['Holiday (copy)', 'Holiday (copy 2)', 'Holiday (copy 3)'])
    ).toBe('Holiday (copy 4)');
  });

  test('is case-insensitive against existing titles', () => {
    expect(nextDuplicateTitle('Holiday', ['holiday (copy)'])).toBe('Holiday (copy 2)');
  });

  test('falls back for empty base', () => {
    expect(nextDuplicateTitle('  ', [])).toBe('Wishlist (copy)');
  });
});
