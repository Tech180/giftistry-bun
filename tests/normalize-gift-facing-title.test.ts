import { describe, expect, test } from 'bun:test';
import { isVerboseProductTitle } from '../src/modules/item/domain/utils/is-verbose-product-title.util';
import { mergeExtractedMetadata } from '../src/modules/item/domain/utils/merge-extracted-metadata.util';
import { normalizeGiftFacingTitle } from '../src/modules/item/domain/utils/normalize-gift-facing-title.util';
import { polishGiftFacingMetadata } from '../src/modules/item/domain/utils/polish-gift-facing-metadata.util';
import { groundAiFields } from '../src/modules/item/domain/utils/ground-ai-fields.util';
import type { ExtractedMetadata } from '../src/modules/item/domain/interfaces/extracted-metadata.interface';

const RAZER_SEO_TITLE = 'Ultra-Thin Razer Blade 14 Gaming Laptop💻 | Razer United States';

const base: ExtractedMetadata = {
  title: '',
  price: null,
  description: null,
  color: null,
  size: null,
  category: null,
  imageUrl: null,
};

describe('normalizeGiftFacingTitle', () => {
  test('reduces a retailer SEO title to the product identity', () => {
    expect(normalizeGiftFacingTitle(RAZER_SEO_TITLE)).toBe('Razer Blade 14');
  });

  test('removes emoji and trademark symbols', () => {
    expect(normalizeGiftFacingTitle('Acme Widget 💻✨')).toBe('Acme Widget');
    expect(normalizeGiftFacingTitle('Acme® Widget™')).toBe('Acme Widget');
  });

  test('drops a pipe-separated store suffix', () => {
    expect(normalizeGiftFacingTitle('Acme Widget Pro | Acme Official Store')).toBe('Acme Widget Pro');
  });

  test('keeps the type phrase when it is the whole product name', () => {
    expect(normalizeGiftFacingTitle('Gaming Laptop')).toBe('Gaming Laptop');
    expect(normalizeGiftFacingTitle('Razer Gaming Laptop')).toBe('Razer Gaming Laptop');
  });

  test('keeps short titles and ordinary comma titles intact', () => {
    expect(normalizeGiftFacingTitle('New Balance 990v6')).toBe('New Balance 990v6');
    expect(normalizeGiftFacingTitle('Socks, Pack of 6')).toBe('Socks, Pack of 6');
    expect(normalizeGiftFacingTitle('Dyson V11 Torque Drive Cordless Vacuum Cleaner, Blue')).toBe(
      'Dyson V11 Torque Drive Cordless Vacuum Cleaner, Blue'
    );
  });

  test('handles empty input and is idempotent', () => {
    expect(normalizeGiftFacingTitle(null)).toBe('');
    expect(normalizeGiftFacingTitle('   ')).toBe('');
    const once = normalizeGiftFacingTitle(RAZER_SEO_TITLE);
    expect(normalizeGiftFacingTitle(once)).toBe(once);
  });
});

describe('isVerboseProductTitle', () => {
  test('flags emoji and pipe store suffixes but not simple comma titles', () => {
    expect(isVerboseProductTitle(RAZER_SEO_TITLE)).toBe(true);
    expect(isVerboseProductTitle('Acme Widget 💻')).toBe(true);
    expect(isVerboseProductTitle('Acme Widget | Acme Store')).toBe(true);
    expect(isVerboseProductTitle('Socks, Pack of 6')).toBe(false);
  });
});

describe('title normalization wiring', () => {
  test('polish cleans a title that is not verbose by length or segment count', () => {
    const polished = polishGiftFacingMetadata({ ...base, title: RAZER_SEO_TITLE });
    expect(polished.title).toBe('Razer Blade 14');
  });

  test('merge normalizes an AI title that echoes the scraped SEO title', () => {
    const merged = mergeExtractedMetadata(
      { ...base, title: RAZER_SEO_TITLE },
      { ...base, title: RAZER_SEO_TITLE },
      false
    );
    expect(merged.title).toBe('Razer Blade 14');
  });

  test('grounding normalizes an AI title that echoes the scrape title', () => {
    const { metadata, droppedFields } = groundAiFields(
      { ...base, title: RAZER_SEO_TITLE },
      `Page Title: ${RAZER_SEO_TITLE}`,
      RAZER_SEO_TITLE
    );
    expect(metadata.title).toBe('Razer Blade 14');
    expect(droppedFields).not.toContain('title');
  });
});
