import { describe, expect, test } from 'bun:test';
import { resolveItemCategory, resolveCategoryAlternatives } from '../src/modules/item/domain/resolve-item-category.util';

describe('resolveItemCategory', () => {
  test('reuses existing list string when normalized forms match', () => {
    expect(resolveItemCategory('toys', ['Toys', 'Games'])).toBe('Toys');
    expect(resolveItemCategory('TOYS', ['Toys'])).toBe('Toys');
  });

  test('maps standard labels and ids', () => {
    expect(resolveItemCategory('Digital & Tech', [])).toBe('digital_tech');
    expect(resolveItemCategory('digital_tech', [])).toBe('digital_tech');
  });

  test('normalizes unknown labels to slugs', () => {
    expect(resolveItemCategory('Board Games', [])).toBe('board_games');
    expect(resolveItemCategory('', [])).toBe('uncategorized');
  });
});

describe('resolveCategoryAlternatives', () => {
  test('resolves and de-dupes against primary', () => {
    expect(
      resolveCategoryAlternatives(['Toys', 'toys', 'apparel_accessories'], 'Toys', ['Toys'])
    ).toEqual(['apparel_accessories']);
  });
});
