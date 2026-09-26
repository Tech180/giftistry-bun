import { describe, expect, test } from 'bun:test';
import { nextRolloverTitle } from '../src/modules/wishlist/domain/utils/next-rollover-title.util';

describe('nextRolloverTitle', () => {
  test('appends 1 when there is no trailing number', () => {
    expect(nextRolloverTitle('Birthday')).toBe('Birthday 1');
  });

  test('increments an existing trailing number', () => {
    expect(nextRolloverTitle('Birthday 1')).toBe('Birthday 2');
  });

  test('increments a year-style trailing number', () => {
    expect(nextRolloverTitle('Holiday List 2026')).toBe('Holiday List 2027');
  });

  test('normalizes leading and trailing whitespace', () => {
    expect(nextRolloverTitle('  Party  3  ')).toBe('Party 4');
  });

  test('does not treat glued digits as a suffix', () => {
    expect(nextRolloverTitle('Item2')).toBe('Item2 1');
  });

  test('returns 1 for empty or whitespace-only titles', () => {
    expect(nextRolloverTitle('')).toBe('1');
    expect(nextRolloverTitle('   ')).toBe('1');
  });
});
