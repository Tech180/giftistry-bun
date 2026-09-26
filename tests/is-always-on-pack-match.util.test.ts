import { describe, expect, test } from 'bun:test';
import { isAlwaysOnPackMatch } from '../src/modules/system/domain/packs/utils/is-always-on-pack-match.util';

describe('isAlwaysOnPackMatch', () => {
  test('empty categories and keywords always apply', () => {
    expect(isAlwaysOnPackMatch({ categories: [] })).toBe(true);
    expect(isAlwaysOnPackMatch({ categories: [], titleKeywords: [] })).toBe(true);
  });

  test('built-in CPU-style match is not always-on', () => {
    expect(isAlwaysOnPackMatch({ categories: ['tech'], titleKeywords: ['cpu', 'processor'] })).toBe(
      false
    );
    expect(isAlwaysOnPackMatch({ categories: ['tech'] })).toBe(false);
    expect(isAlwaysOnPackMatch({ categories: [], titleKeywords: ['cpu'] })).toBe(false);
  });
});
