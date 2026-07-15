import { describe, expect, test } from 'bun:test';
import {
  compileCategoryPrompt,
  normalizeCategoryLabel,
  parseCategoryJson,
} from '../src/modules/item/infrastructure/gemini-category-classifier';

describe('compileCategoryPrompt', () => {
  test('replaces category prompt tokens', () => {
    const prompt = compileCategoryPrompt(
      'URL={url}; Store={websiteName}; Name={itemName}; Context={pageContext}; Existing={existingCategories}',
      {
        url: 'https://shop.example/item',
        websiteName: 'Example',
        itemName: 'Cool Tee',
        pageContext: 'Title: Tee',
        existingCategories: ['Toys', 'Games'],
      }
    );

    expect(prompt).toContain('URL=https://shop.example/item');
    expect(prompt).toContain('Store=Example');
    expect(prompt).toContain('Name=Cool Tee');
    expect(prompt).toContain('Context=Title: Tee');
    expect(prompt).toContain('Existing=Toys, Games');
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
    expect(parseCategoryJson('{"Category":"Tech Gadgets"}')).toEqual({
      category: 'tech_gadgets',
      alternatives: [],
    });
  });

  test('parses alternatives and excludes duplicate primary', () => {
    expect(
      parseCategoryJson(
        '{"Category":"clothing","Alternatives":["Apparel","health_wellness","clothing"]}'
      )
    ).toEqual({
      category: 'clothing',
      alternatives: ['apparel', 'health_wellness'],
    });
  });
});
