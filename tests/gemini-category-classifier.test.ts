import { describe, expect, test } from 'bun:test';
import {
  compileCategoryPrompt,
  normalizeCategoryLabel,
  parseCategoryJson,
} from '../src/modules/item/infrastructure/gemini-category-classifier';

describe('compileCategoryPrompt', () => {
  test('replaces category prompt tokens', () => {
    const prompt = compileCategoryPrompt(
      'URL={url}; Store={websiteName}; Name={itemName}; Context={pageContext}',
      {
        url: 'https://shop.example/item',
        websiteName: 'Example',
        itemName: 'Cool Tee',
        pageContext: 'Title: Tee',
      }
    );

    expect(prompt).toContain('URL=https://shop.example/item');
    expect(prompt).toContain('Store=Example');
    expect(prompt).toContain('Name=Cool Tee');
    expect(prompt).toContain('Context=Title: Tee');
  });
});

describe('normalizeCategoryLabel', () => {
  test('normalizes free-form labels to slugs', () => {
    expect(normalizeCategoryLabel('Food & Grocery')).toBe('food_grocery');
    expect(normalizeCategoryLabel('')).toBe('uncategorized');
  });
});

describe('parseCategoryJson', () => {
  test('parses category from JSON response', () => {
    expect(parseCategoryJson('{"category":"Tech Gadgets"}')).toBe('tech_gadgets');
  });
});
