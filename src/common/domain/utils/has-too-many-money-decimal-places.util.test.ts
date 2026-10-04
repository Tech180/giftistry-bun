import { describe, expect, test } from 'bun:test';
import { hasTooManyMoneyDecimalPlaces } from './has-too-many-money-decimal-places.util';

describe('has-too-many-money-decimal-places.util', () => {
  test('allows cent precision', () => {
    expect(hasTooManyMoneyDecimalPlaces(19.99)).toBe(false);
  });

  test('rejects sub-cent precision', () => {
    expect(hasTooManyMoneyDecimalPlaces(1.999)).toBe(true);
  });
});
