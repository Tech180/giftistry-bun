import { describe, expect, test } from 'bun:test';
import { mapScrapeToCustomFields } from '../src/modules/item/infrastructure/map-scrape-to-custom-fields';

describe('mapScrapeToCustomFields', () => {
  test('maps color to single Color key', () => {
    const mapped = mapScrapeToCustomFields(
      {
        title: 'Tee',
        price: null,
        description: null,
        color: 'Blue',
        size: null,
        category: 'clothing',
        imageUrl: null,
      },
      'https://shop.example/tee'
    );

    expect(mapped.predefinedFields.Color).toBe('Blue');
    expect(mapped.predefinedFields.preferredColor).toBeUndefined();
  });

  test('routes shoe sizes to ShoesSize for apparel', () => {
    const mapped = mapScrapeToCustomFields(
      {
        title: 'Running Sneaker',
        price: null,
        description: null,
        color: null,
        size: '10.5',
        category: 'apparel_accessories',
        imageUrl: null,
      },
      'https://shop.example/shoes'
    );

    expect(mapped.predefinedFields.ShoesSize).toBe('10.5');
  });

  test('routes pants sizes to PantsSize for apparel', () => {
    const mapped = mapScrapeToCustomFields(
      {
        title: 'Jeans',
        price: null,
        description: null,
        color: null,
        size: '32x30',
        category: 'clothing',
        imageUrl: null,
      },
      'https://shop.example/jeans'
    );

    expect(mapped.predefinedFields.PantsSize).toBe('32x30');
  });

  test('does not map size for non-apparel products', () => {
    const mapped = mapScrapeToCustomFields(
      {
        title: 'Wireless Headphones',
        price: null,
        description: null,
        color: null,
        size: 'Standard',
        category: 'digital_tech',
        imageUrl: null,
      },
      'https://shop.example/headphones'
    );

    expect(mapped.predefinedFields.ShirtSize).toBeUndefined();
    expect(Object.keys(mapped.predefinedFields)).toHaveLength(0);
  });
});
