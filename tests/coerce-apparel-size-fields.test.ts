import { describe, expect, test } from 'bun:test';
import { coerceApparelSizeFields } from '../src/modules/item/domain/coerce-apparel-size-fields.util';

describe('coerceApparelSizeFields', () => {
  test('keeps ShirtSize only for a shirt when AI filled both', () => {
    const result = coerceApparelSizeFields({
      predefinedFields: { ShirtSize: 'M', PantsSize: 'M', Color: 'Blue' },
      url: 'https://shop.example/tee',
      title: 'Cool Tee Shirt',
      category: 'apparel',
      size: 'M',
    });
    expect(result.ShirtSize).toBe('M');
    expect(result.PantsSize).toBeUndefined();
    expect(result.Color).toBe('Blue');
  });

  test('keeps PantsSize for jeans', () => {
    const result = coerceApparelSizeFields({
      predefinedFields: { ShirtSize: '32x30', PantsSize: '32x30' },
      url: 'https://shop.example/jeans',
      title: 'Slim Jeans',
      category: 'clothing',
      size: '32x30',
    });
    expect(result.PantsSize).toBe('32x30');
    expect(result.ShirtSize).toBeUndefined();
  });

  test('prefers scrape-routed key over AI extras', () => {
    const result = coerceApparelSizeFields({
      predefinedFields: { ShirtSize: 'L', PantsSize: 'L', SocksSize: 'L' },
      url: 'https://shop.example/hoodie',
      title: 'Zip Hoodie',
      scrapePreferredKey: 'ShirtSize',
    });
    expect(result.ShirtSize).toBe('L');
    expect(result.PantsSize).toBeUndefined();
    expect(result.SocksSize).toBeUndefined();
  });
});
