import { describe, expect, test } from 'bun:test';
import { resolveProductCandidate } from '../src/modules/item/domain/utils/resolve-product-candidate.util';

describe('resolveProductCandidate', () => {
  test('returns single candidate with score 1', () => {
    const resolved = resolveProductCandidate(
      [{ name: 'Wireless Headphones', offers: [{ price: 79.99 }] }],
      { h1: 'Wireless Headphones' }
    );
    expect(resolved?.candidate.name).toBe('Wireless Headphones');
    expect(resolved?.score).toBe(1);
  });

  test('prefers candidate matching og:title and offers', () => {
    const resolved = resolveProductCandidate(
      [
        { name: 'Random Gadget', offers: [{ price: 1 }] },
        { name: 'Blue Running Shoes', offers: [{ price: 89 }] },
        { name: 'Kitchen Mixer', offers: [{ price: 120 }] },
      ],
      {
        ogTitle: 'Blue Running Shoes — Store',
        h1: 'Blue Running Shoes',
        mainContentText: 'Lightweight blue running shoes for daily training.',
      },
      'https://shop.example.com/products/blue-running-shoes'
    );
    expect(resolved?.candidate.name).toBe('Blue Running Shoes');
    expect(resolved!.score).toBeGreaterThan(0.5);
  });
});
