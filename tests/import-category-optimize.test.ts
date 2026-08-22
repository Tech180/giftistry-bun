import { describe, expect, test } from 'bun:test';
import {
  isSoftImportCategory,
  isLockedImportCategory,
  resolveImportCategoryWithOptimize,
} from '../src/modules/item/domain/is-soft-import-category.util';

describe('isSoftImportCategory', () => {
  test('treats empty and generic labels as soft', () => {
    expect(isSoftImportCategory(null)).toBe(true);
    expect(isSoftImportCategory(undefined)).toBe(true);
    expect(isSoftImportCategory('')).toBe(true);
    expect(isSoftImportCategory('  ')).toBe(true);
    expect(isSoftImportCategory('uncategorized')).toBe(true);
    expect(isSoftImportCategory('Uncategorized')).toBe(true);
    expect(isSoftImportCategory('general')).toBe(true);
    expect(isSoftImportCategory('General Items')).toBe(true);
  });

  test('treats real categories as locked', () => {
    expect(isSoftImportCategory('Toys')).toBe(false);
    expect(isSoftImportCategory('electronics')).toBe(false);
    expect(isLockedImportCategory('Books')).toBe(true);
  });
});

describe('resolveImportCategoryWithOptimize', () => {
  test('when optimize is on, prefers proposed category', () => {
    expect(
      resolveImportCategoryWithOptimize('Toys', 'Games', true)
    ).toBe('Games');
  });

  test('when optimize is off, keeps locked source category', () => {
    expect(
      resolveImportCategoryWithOptimize('Toys', 'Board Games', false)
    ).toBe('Toys');
  });

  test('when optimize is off, allows AI to fill soft source categories', () => {
    expect(
      resolveImportCategoryWithOptimize('uncategorized', 'Toys', false)
    ).toBe('Toys');
    expect(
      resolveImportCategoryWithOptimize(null, 'Electronics', false)
    ).toBe('Electronics');
  });

  test('when optimize is off and both empty, returns source', () => {
    expect(
      resolveImportCategoryWithOptimize(null, null, false)
    ).toBeNull();
  });
});
