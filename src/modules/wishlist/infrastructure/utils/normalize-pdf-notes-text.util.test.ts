import { describe, expect, test } from 'bun:test';
import {
  countWrappedTextLines,
  normalizePdfNotesText,
} from './normalize-pdf-notes-text.util';

describe('normalizePdfNotesText', () => {
  test('collapses blank lines and runs of whitespace into a single paragraph', () => {
    const input = `This enamel pin features David.\n\nThe design captures neon tones.\n\n  At fifteen dollars, this is affordable.`;
    expect(normalizePdfNotesText(input)).toBe(
      'This enamel pin features David. The design captures neon tones. At fifteen dollars, this is affordable.'
    );
  });

  test('normalizes Windows newlines', () => {
    expect(normalizePdfNotesText('Line one.\r\n\r\nLine two.')).toBe('Line one. Line two.');
  });
});

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
