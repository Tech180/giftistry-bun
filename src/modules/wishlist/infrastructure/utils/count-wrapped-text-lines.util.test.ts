import { describe, expect, test } from 'bun:test';
import { countWrappedTextLines } from './count-wrapped-text-lines.util';

describe('countWrappedTextLines', () => {
  const monoFont = {
    widthOfTextAtSize: (value: string, size: number) => value.length * size,
  };

  test('counts wrapped lines for a fixed-width font', () => {
    expect(countWrappedTextLines('one two three four', monoFont, 1, 9)).toBe(3);
  });

  test('returns 0 for empty text', () => {
    expect(countWrappedTextLines('   ', monoFont, 1, 10)).toBe(0);
  });
});
