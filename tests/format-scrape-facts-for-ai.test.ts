import { describe, expect, test } from 'bun:test';
import {
  formatScrapeFactsForAi,
  shouldAttachScrapeFacts,
} from '../src/modules/item/domain/utils/format-scrape-facts-for-ai.util';
import type { ExtractedMetadata } from '../src/modules/item/domain/interfaces/extracted-metadata.interface';

const base: ExtractedMetadata = {
  title: 'Widget',
  price: 12.5,
  description: 'A nice widget',
  color: 'Blue',
  size: null,
  category: 'tech',
  imageUrl: 'https://example.com/w.jpg',
  predefinedFields: { ModelNumber: 'W-1' },
  userDefinedFields: { Brand: 'Acme' },
};

describe('formatScrapeFactsForAi', () => {
  test('returns empty string when no facts', () => {
    expect(
      formatScrapeFactsForAi({
        title: '',
        price: null,
        description: null,
        color: null,
        size: null,
        category: null,
        imageUrl: null,
      })
    ).toBe('');
  });

  test('serializes compact JSON with scraped facts label', () => {
    const text = formatScrapeFactsForAi(base);
    expect(text.startsWith('Scraped facts')).toBe(true);
    expect(text).toContain('"title":"Widget"');
    expect(text).toContain('"Brand":"Acme"');
    expect(text).toContain('"ModelNumber":"W-1"');
  });
});

describe('shouldAttachScrapeFacts', () => {
  test('attaches whenever scrape has facts and page is not blocked', () => {
    expect(shouldAttachScrapeFacts({ diagnostics: { confidence: 'high' } }, base)).toBe(true);
    expect(shouldAttachScrapeFacts({ diagnostics: { confidence: 'low' } }, base)).toBe(true);
    expect(shouldAttachScrapeFacts({ diagnostics: { confidence: 'medium' } }, base)).toBe(true);
    expect(
      shouldAttachScrapeFacts({ diagnostics: { confidence: 'high', blocked: true } }, base)
    ).toBe(false);
    expect(
      shouldAttachScrapeFacts(
        { diagnostics: { confidence: 'high' } },
        {
          title: '',
          price: null,
          description: null,
          color: null,
          size: null,
          category: null,
          imageUrl: null,
          predefinedFields: {},
          userDefinedFields: {},
        }
      )
    ).toBe(false);
  });
});
