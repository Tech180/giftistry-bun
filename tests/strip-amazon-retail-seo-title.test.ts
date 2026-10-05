import { describe, expect, test } from 'bun:test';
import { stripAmazonRetailSeoTitle } from '../src/modules/item/domain/utils/strip-amazon-retail-seo-title.util';

describe('stripAmazonRetailSeoTitle', () => {
  test('removes Amazon.com prefix and category suffix', () => {
    expect(
      stripAmazonRetailSeoTitle('Amazon.com: Wireless Mouse : Electronics')
    ).toBe('Wireless Mouse');
  });

  test('returns trimmed plain titles unchanged', () => {
    expect(stripAmazonRetailSeoTitle('  Desk Lamp  ')).toBe('Desk Lamp');
  });
});
