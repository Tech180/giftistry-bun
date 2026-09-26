import { describe, expect, test } from 'bun:test';
import { normalizePdfNotesText } from './normalize-pdf-notes-text.util';

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
