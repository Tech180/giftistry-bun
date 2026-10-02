import { describe, expect, test } from 'bun:test';
import {
  blockedAiFallbackTrusted,
  buildBlockedPageContext,
  isThinBlockedPageContext,
  titleSupportedBySearch,
} from '../src/modules/item/slices/metadata/utils/blocked-scrape-fallback.util';
import type { ExtractedMetadata } from '../src/modules/item/domain/interfaces/extracted-metadata.interface';

function meta(overrides: Partial<ExtractedMetadata> = {}): ExtractedMetadata {
  return {
    title: '',
    price: null,
    description: null,
    color: null,
    size: null,
    category: null,
    imageUrl: null,
    ...overrides,
  };
}

describe('blocked AI fallback trust', () => {
  const thinContext = buildBlockedPageContext('https://www.amazon.com/dp/B0FHK6N2H4');

  test('isThinBlockedPageContext is true for blocked gate template', () => {
    expect(isThinBlockedPageContext(thinContext)).toBe(true);
  });

  test('isThinBlockedPageContext is false when scrape facts include a title', () => {
    const withFacts = `Scraped facts (prefer when page context conflicts):\n${JSON.stringify({
      title: 'UGREEN 10-Port PoE Switch',
    })}\n\n${thinContext}`;
    expect(isThinBlockedPageContext(withFacts)).toBe(false);
  });

  test('thin context + AI title only + no search is not trusted', () => {
    expect(
      blockedAiFallbackTrusted(meta({ title: 'AYANEO Pocket MICRO 2' }), {
        pageContext: thinContext,
        searchContext: undefined,
      })
    ).toBe(false);
  });

  test('titleSupportedBySearch accepts overlapping product tokens', () => {
    const search =
      'UGREEN 10 Port PoE Switch Gigabit Ethernet - Amazon.com ... Power over Ethernet switch for cameras';
    expect(titleSupportedBySearch('UGREEN 10-Port PoE Switch', search)).toBe(true);
  });

  test('titleSupportedBySearch rejects unrelated handheld title vs UGREEN search', () => {
    const search =
      'UGREEN 10 Port PoE Switch Gigabit Ethernet - Amazon.com ... Power over Ethernet switch for cameras';
    expect(titleSupportedBySearch('AYANEO Pocket MICRO 2', search)).toBe(false);
  });

  test('thin context + corroborated title + search is trusted', () => {
    const search =
      'UGREEN 10 Port PoE Switch Gigabit Ethernet - Amazon.com ... Power over Ethernet switch for cameras';
    expect(
      blockedAiFallbackTrusted(
        meta({
          title: 'UGREEN 10-Port PoE Switch',
          price: 37.79,
          imageUrl: 'https://example.com/img.jpg',
        }),
        { pageContext: thinContext, searchContext: search }
      )
    ).toBe(true);
  });

  test('non-thin context with scrape-facts title is trusted without search', () => {
    const withFacts = `Scraped facts (prefer when page context conflicts):\n${JSON.stringify({
      title: 'Fosi Audio DAC',
    })}\n\n${thinContext}`;
    expect(
      blockedAiFallbackTrusted(meta({ title: 'Fosi Audio DAC', price: 49.99 }), {
        pageContext: withFacts,
        searchContext: undefined,
      })
    ).toBe(true);
  });

  test('buildBlockedPageContext instructs not to invent from ASIN alone', () => {
    expect(thinContext).toContain('Do not invent');
    expect(thinContext).toContain('ASIN: B0FHK6N2H4');
    expect(thinContext).not.toContain('Infer product details');
  });
});
