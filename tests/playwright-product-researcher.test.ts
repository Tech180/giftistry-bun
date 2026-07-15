import { describe, expect, test } from 'bun:test';
import {
  buildSearchQuery,
  formatSearchContext,
  parseSearchResults,
} from '../src/modules/item/infrastructure/playwright-product-researcher';
import { sanitizeProductDescription } from '../src/modules/item/domain/sanitize-product-description.util';
import { getDefaultAiPrompt } from '../src/modules/system/domain/ai-default-prompts';
import { compilePopulatePrompt } from '../src/modules/item/infrastructure/gemini-metadata-populator';

const fixture = await Bun.file(`${import.meta.dir}/fixtures/duckduckgo-search-results.html`).text();

describe('buildSearchQuery', () => {
  test('includes item name, website, and specifications', () => {
    expect(
      buildSearchQuery({
        itemName: 'AYANEO Pocket MICRO 2',
        websiteName: 'AYANEO',
      })
    ).toBe('AYANEO Pocket MICRO 2 AYANEO specifications');
  });
});

describe('parseSearchResults', () => {
  test('parses titles, urls, and snippets from DDG HTML fixture', () => {
    const results = parseSearchResults(fixture);

    expect(results).toHaveLength(2);
    expect(results[0]?.title).toBe('AYANEO Pocket MICRO 2 Specs');
    expect(results[0]?.url).toBe('https://example.com/ayaneo-specs');
    expect(results[0]?.snippet).toContain('8GB RAM');
    expect(results[1]?.url).toBe('https://review.example.com/pocket-micro-2');
  });
});

describe('formatSearchContext', () => {
  test('formats query, results, and fetched pages', () => {
    const context = formatSearchContext(
      'AYANEO Pocket MICRO 2 specifications',
      [
        {
          title: 'Specs',
          url: 'https://example.com/specs',
          snippet: '8GB RAM',
        },
      ],
      [{ url: 'https://example.com/specs', content: 'Detailed specs page' }]
    );

    expect(context).toContain('Search query: AYANEO Pocket MICRO 2 specifications');
    expect(context).toContain('Snippet: 8GB RAM');
    expect(context).toContain('Detailed specs page');
  });
});

describe('sanitizeProductDescription', () => {
  test('removes RAM and storage mentions when fields are present', () => {
    const cleaned = sanitizeProductDescription(
      'Compact 2-in-1 device with 8GB RAM and 256GB storage for on-the-go productivity.',
      {
        userDefinedFields: { RAM: '8GB' },
        predefinedFields: { StorageCapacity: '256GB' },
      }
    );

    expect(cleaned).not.toContain('8GB');
    expect(cleaned).not.toContain('256GB');
    expect(cleaned).not.toContain('RAM');
    expect(cleaned).not.toContain('storage');
  });
});

describe('populate prompt spec-free rules', () => {
  test('default populate prompt forbids specs in description', () => {
    const prompt = getDefaultAiPrompt('populate');
    expect(prompt).toContain('NEVER mention RAM, storage');
    expect(prompt).toContain('{searchContext}');
  });

  test('compilePopulatePrompt adds reconcile rules when requested', () => {
    const prompt = compilePopulatePrompt(
      'Page={pageContext}; Search={searchContext}',
      {
        url: 'https://shop.example/item',
        pageContext: 'Title: Handheld',
        searchContext: 'Search query: specs',
        reconcileSources: true,
      }
    );

    expect(prompt).toContain('Reconcile rules');
    expect(prompt).toContain('Search query: specs');
  });
});
