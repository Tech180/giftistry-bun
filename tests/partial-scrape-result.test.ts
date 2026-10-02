import { describe, expect, test } from 'bun:test';
import { hasPartialScrapeSignal } from '../src/modules/item/domain/utils/has-partial-scrape-signal.util';
import { resolvePartialScrapeResult } from '../src/modules/item/infrastructure/adapters/utils/resolve-partial-scrape-result.util';

describe('partial scrape policy', () => {
  test('hasPartialScrapeSignal requires title or image', () => {
    expect(hasPartialScrapeSignal({ title: '', price: null, description: null, color: null, size: null, category: null, imageUrl: null })).toBe(false);
    expect(
      hasPartialScrapeSignal({
        title: 'Widget',
        price: null,
        description: null,
        color: null,
        size: null,
        category: null,
        imageUrl: null,
      })
    ).toBe(true);
    expect(
      hasPartialScrapeSignal({
        title: '',
        price: null,
        description: null,
        color: null,
        size: null,
        category: null,
        imageUrl: 'https://cdn.example/x.jpg',
      })
    ).toBe(true);
  });

  test('resolvePartialScrapeResult returns needsReview low confidence result', () => {
    const html = `<!doctype html><html><head><title>Gate</title></head><body>${'x'.repeat(600)}</body></html>`;
    const partial = resolvePartialScrapeResult({
      extraction: {
        metadata: {
          title: 'Salvaged Title',
          price: null,
          description: null,
          color: null,
          size: null,
          category: null,
          imageUrl: null,
          fieldSources: { title: 'meta' },
        },
        fieldsFound: ['title'],
        titleFromSlug: false,
        confidence: 'low',
      },
      validation: {
        valid: false,
        reason: 'bot-check:captcha',
        blocked: true,
        confidence: 'low',
        fieldsFound: ['title'],
      },
      source: 'playwright',
      finalUrl: 'https://shop.example.com/p/sku',
      html,
      blockedHint: true,
    });

    expect(partial).not.toBeNull();
    expect(partial!.diagnostics.needsReview).toBe(true);
    expect(partial!.diagnostics.confidence).toBe('low');
    expect(partial!.diagnostics.outcome).toBe('blocked');
    expect(partial!.diagnostics.fieldSources?.title).toBe('meta');
    expect(partial!.data.title).toBe('Salvaged Title');
  });

  test('returns null when blocked page has no salvageable fields', () => {
    const partial = resolvePartialScrapeResult({
      extraction: {
        metadata: {
          title: '',
          price: null,
          description: null,
          color: null,
          size: null,
          category: null,
          imageUrl: null,
        },
        fieldsFound: [],
        titleFromSlug: false,
        confidence: 'low',
      },
      validation: {
        valid: false,
        reason: 'bot-check:captcha',
        blocked: true,
        confidence: 'low',
        fieldsFound: [],
      },
      source: 'playwright',
      finalUrl: 'https://shop.example.com/p/sku',
      html: '<html><body>captcha</body></html>'.padEnd(600, ' '),
      blockedHint: true,
    });
    expect(partial).toBeNull();
  });
});
