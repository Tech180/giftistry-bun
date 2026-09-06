import { describe, expect, test } from 'bun:test';
import {
  isMoneyAmountAtLeast,
  moneyAmountLeftover,
  toMoneyCents,
  wouldExceedMoneyTarget,
} from './compare-money-amount.util';

describe('compare-money-amount.util', () => {
  test('toMoneyCents handles float drift from summed claim amounts', () => {
    expect(30 + 19.99).not.toBe(49.99);
    expect(toMoneyCents(30 + 19.99)).toBe(4999);
    expect(toMoneyCents(49.99)).toBe(4999);
  });

  test('isMoneyAmountAtLeast treats float drift totals as meeting target', () => {
    expect(isMoneyAmountAtLeast(30 + 19.99, 49.99)).toBe(true);
    expect(isMoneyAmountAtLeast(49.98, 49.99)).toBe(false);
  });

  test('moneyAmountLeftover returns zero when float drift meets target', () => {
    expect(moneyAmountLeftover(49.99, 30 + 19.99)).toBe(0);
  });

  test('wouldExceedMoneyTarget uses cent comparison', () => {
    expect(wouldExceedMoneyTarget(30, 19.99, 49.99)).toBe(false);
    expect(wouldExceedMoneyTarget(30, 20, 49.99)).toBe(true);
  });
});
