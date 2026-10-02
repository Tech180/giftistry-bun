import { describe, expect, test } from 'bun:test';
import { trimPageContextForAi } from '../src/modules/item/domain/utils/trim-page-context-for-ai.util';

describe('trimPageContextForAi', () => {
  test('returns unchanged when no cap', () => {
    const ctx = 'Product Name: Widget\nBrand: Acme';
    expect(trimPageContextForAi(ctx, { pageContextMaxChars: null })).toBe(ctx);
  });

  test('keeps priority lines when over budget', () => {
    const ctx = [
      'Store Name: Example',
      'Product Name: Widget',
      'Brand: Acme',
      'Noise: ' + 'x'.repeat(500),
      'More noise line',
    ].join('\n');
    const trimmed = trimPageContextForAi(ctx, { pageContextMaxChars: 120 });
    expect(trimmed).toContain('Store Name: Example');
    expect(trimmed).toContain('Product Name: Widget');
    expect(trimmed.length).toBeLessThanOrEqual(120);
  });

  test('fills remaining budget with non-priority lines', () => {
    const ctx = ['Product Name: A', 'Extra detail one', 'Extra detail two'].join('\n');
    const trimmed = trimPageContextForAi(ctx, { pageContextMaxChars: 80 });
    expect(trimmed).toContain('Product Name: A');
    expect(trimmed).toContain('Extra detail one');
  });
});
