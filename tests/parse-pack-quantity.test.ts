import { describe, expect, test } from 'bun:test';
import { parsePackQuantity, resolveDesiredQuantity } from '../src/modules/item/domain/parse-pack-quantity.util';

describe('parsePackQuantity', () => {
  test('parses xN pack cues', () => {
    expect(parsePackQuantity('Socks x5')).toBe(5);
    expect(parsePackQuantity('Tee x 12')).toBe(12);
  });

  test('parses pack of / N-pack', () => {
    expect(parsePackQuantity('Batteries pack of 8')).toBe(8);
    expect(parsePackQuantity('6-pack socks')).toBe(6);
  });

  test('ignores pants waist×inseam', () => {
    expect(parsePackQuantity('Jeans 32x30')).toBeNull();
    expect(parsePackQuantity('Pant Size 32x32')).toBeNull();
  });

  test('ignores out of range', () => {
    expect(parsePackQuantity('item x1')).toBeNull();
    expect(parsePackQuantity('item x100')).toBeNull();
  });
});

describe('resolveDesiredQuantity', () => {
  test('prefers valid AI quantity over title parse', () => {
    expect(resolveDesiredQuantity(5, 'Socks')).toBe(5);
    expect(resolveDesiredQuantity(1, 'Socks x5')).toBe(5);
  });
});
