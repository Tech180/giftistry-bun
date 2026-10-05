import { describe, expect, test } from 'bun:test';
import { resolveEnrichWriteBackFields } from '../src/modules/jobs/application/utils/resolve-enrich-write-back-fields.util';

describe('resolveEnrichWriteBackFields', () => {
  test('keeps name when blocked scrape only has generic title but applies price', () => {
    const result = resolveEnrichWriteBackFields({
      extract: {
        title: 'Amazon',
        price: 19.99,
        description: 'blocked desc',
        category: 'electronics',
        imageUrl: 'https://cdn.example/x.jpg',
      },
      diagnostics: {
        blocked: true,
        needsReview: true,
        validationReason: 'bot-check:captcha',
      },
      current: {
        name: 'My Gift',
        description: 'Keep me',
        category: 'home',
      },
      fallbackUrl: 'https://www.amazon.com/dp/B000',
      finalUrl: 'https://www.amazon.com/dp/B000',
      websiteName: 'Amazon',
    });

    expect(result.name).toBe('My Gift');
    expect(result.description).toBe('Keep me');
    expect(result.category).toBe('home');
    expect(result.price).toBe(19.99);
    expect(result.linkUrl).toBe('https://www.amazon.com/dp/B000');
    expect(result.websiteName).toBe('Amazon');
    expect(result.imageUrl).toBe('https://cdn.example/x.jpg');
  });

  test('merges sanitized title when scrape succeeds', () => {
    const result = resolveEnrichWriteBackFields({
      extract: {
        title: 'Amazon.com: Nice Lamp : Home',
        price: 12,
        description: 'Bright',
        category: 'lighting',
      },
      diagnostics: { blocked: false },
      current: {
        name: 'New item',
        description: '',
        category: null,
      },
      fallbackUrl: 'https://example.com',
    });

    expect(result.name).toBe('Nice Lamp');
    expect(result.description).toBe('Bright');
    expect(result.category).toBe('lighting');
  });
});
