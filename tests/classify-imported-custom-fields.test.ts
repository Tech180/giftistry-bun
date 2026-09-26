import { describe, expect, test } from 'bun:test';
import { classifyImportedCustomFields } from '../src/modules/item/domain/utils/classify-imported-custom-fields.util';
import { buildImportedItemCreatePayload } from '../src/modules/item/domain/utils/build-imported-item-metadata.util';
import type { ImportedItemPreview } from '../src/modules/item/domain/interfaces/imported-item-preview.interface';

describe('classifyImportedCustomFields', () => {
  test('maps Color casing to Predefined.Color', () => {
    const result = classifyImportedCustomFields([{ key: 'color', value: 'Blue' }]);
    expect(result.Predefined.Color).toBe('Blue');
    expect(result.color).toBe('Blue');
    expect(result.UserDefined).toEqual({});
  });

  test('passes unknown keys to UserDefined with original label', () => {
    const result = classifyImportedCustomFields([{ key: 'Brand', value: 'Acme' }]);
    expect(result.UserDefined.Brand).toBe('Acme');
    expect(result.Predefined).toEqual({});
  });

  test('coerces bare Size to ShirtSize for apparel category', () => {
    const result = classifyImportedCustomFields(
      [{ key: 'Size', value: 'M' }],
      { title: 'Cotton Tee', category: 'Apparel', url: '' }
    );
    expect(result.Predefined.ShirtSize).toBe('M');
    expect(result.UserDefined.Size).toBeUndefined();
    expect(result.size).toBe('M');
  });

  test('stores bare Size as UserDefined when not apparel', () => {
    const result = classifyImportedCustomFields(
      [{ key: 'Size', value: 'Large' }],
      { title: 'Mystery Box', category: 'Other', url: '' }
    );
    expect(result.UserDefined.Size).toBe('Large');
    expect(result.Predefined.ShirtSize).toBeUndefined();
  });

  test('merges legacy color and size', () => {
    const result = classifyImportedCustomFields(
      [],
      { title: 'Socks', category: 'Apparel' },
      { color: 'Blue', size: 'L' }
    );
    expect(result.Predefined.Color).toBe('Blue');
    expect(result.Predefined.SocksSize || result.Predefined.ShirtSize).toBeTruthy();
  });
});

describe('buildImportedItemCreatePayload', () => {
  test('attaches CustomFields metadata for MD custom fields', () => {
    const item: ImportedItemPreview = {
      name: 'Socks',
      description: 'Warm socks',
      category: 'Apparel',
      color: 'Blue',
      customFields: {
        Predefined: { Color: 'Blue' },
        UserDefined: { Brand: 'Acme' },
      },
    };
    const payload = buildImportedItemCreatePayload(item);
    expect(payload.description).toBe('Warm socks');
    expect(payload.metadata?.CustomFields?.Predefined?.Color).toBe('Blue');
    expect(payload.metadata?.CustomFields?.UserDefined?.Brand).toBe('Acme');
  });

  test('attaches favorite and quantity on metadata without Description JSON', () => {
    const item: ImportedItemPreview = {
      name: 'Mug',
      description: 'Ceramic',
      isFavorite: true,
      desiredQuantity: 3,
    };
    const payload = buildImportedItemCreatePayload(item);
    expect(payload.description).toBe('Ceramic');
    expect(payload.metadata?.IsFavorite).toBe(true);
    expect(payload.metadata?.DesiredQuantity).toBe(3);
    expect(payload.metadata?.MultiCount).toBe(true);
  });

  test('keeps description-only when no metadata needed', () => {
    const item: ImportedItemPreview = {
      name: 'Mug',
      description: 'Ceramic',
    };
    const payload = buildImportedItemCreatePayload(item);
    expect(payload).toEqual({ description: 'Ceramic', metadata: null });
  });

  test('builds metadata from legacy color/size alone', () => {
    const item: ImportedItemPreview = {
      name: 'Shirt',
      category: 'Apparel',
      color: 'Red',
      size: 'M',
    };
    const payload = buildImportedItemCreatePayload(item);
    expect(payload.metadata?.CustomFields?.Predefined?.Color).toBe('Red');
    expect(payload.metadata?.CustomFields?.Predefined?.ShirtSize).toBe('M');
  });
});
