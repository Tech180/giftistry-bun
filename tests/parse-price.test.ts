import { describe, expect, test } from 'bun:test';
import { parsePrice } from '../src/modules/item/domain/utils/parse-price.util';

describe('parsePrice', () => {
  test('parses US and EU formats', () => {
    expect(parsePrice('$19.99')?.amount).toBe(19.99);
    expect(parsePrice('1.299,00 €', { tld: 'de' })?.amount).toBe(1299);
    expect(parsePrice('12,50', { lang: 'de' })?.amount).toBe(12.5);
    expect(parsePrice('1,299')?.amount).toBe(1299);
  });

  test('handles ranges', () => {
    const range = parsePrice('$19.99 - $29.99');
    expect(range?.amount).toBe(19.99);
    expect(range?.isRange).toBe(true);
  });

  test('detects currency symbols', () => {
    expect(parsePrice('€12,50', { lang: 'fr' })?.currency).toBe('EUR');
    expect(parsePrice('£9.99')?.currency).toBe('GBP');
  });
});
