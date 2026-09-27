import { describe, expect, test } from 'bun:test';
import { generateAvatarColor, isAvatarColor } from './avatar.util';

describe('generateAvatarColor', () => {
  test('returns hsl colors recognized by isAvatarColor', () => {
    for (let i = 0; i < 20; i++) {
      const color = generateAvatarColor();
      expect(isAvatarColor(color)).toBe(true);
      expect(color.startsWith('hsl(')).toBe(true);
    }
  });
});
