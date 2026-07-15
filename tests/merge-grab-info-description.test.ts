import { describe, expect, test } from 'bun:test';
import { mergeGrabInfoDescription } from '@/modules/jobs/application/merge-grab-info-description.util';

describe('mergeGrabInfoDescription', () => {
  test('returns plain text when no custom fields', () => {
    expect(mergeGrabInfoDescription('Imported notes', 'Scraped notes', {}, {})).toBe(
      'Scraped notes'
    );
    expect(mergeGrabInfoDescription('Imported notes', null, {}, {})).toBe('Imported notes');
  });

  test('serializes JSON when extract fields are present', () => {
    const result = mergeGrabInfoDescription('Imported notes', 'Scraped notes', {
      Color: 'Blue',
    }, { Material: 'Cotton' });

    const parsed = JSON.parse(result);
    expect(parsed.Text).toBe('Scraped notes');
    expect(parsed.CustomFields.Predefined.Color).toBe('Blue');
    expect(parsed.CustomFields.UserDefined.Material).toBe('Cotton');
  });

  test('merges with existing JSON metadata and preserves IsFavorite', () => {
    const existing = JSON.stringify({
      Text: 'Old text',
      IsFavorite: true,
      CustomFields: {
        Predefined: { Color: 'Red' },
        UserDefined: { Brand: 'Acme' },
      },
    });

    const result = mergeGrabInfoDescription(existing, 'New text', { Color: 'Green' }, {
      Size: 'M',
    });
    const parsed = JSON.parse(result);
    expect(parsed.Text).toBe('New text');
    expect(parsed.IsFavorite).toBe(true);
    expect(parsed.CustomFields.Predefined.Color).toBe('Green');
    expect(parsed.CustomFields.UserDefined.Brand).toBe('Acme');
    expect(parsed.CustomFields.UserDefined.Size).toBe('M');
  });

  test('keeps existing text when extract description is empty but fields exist', () => {
    const result = mergeGrabInfoDescription('Keep me', null, { Color: 'Navy' }, {});
    const parsed = JSON.parse(result);
    expect(parsed.Text).toBe('Keep me');
    expect(parsed.CustomFields.Predefined.Color).toBe('Navy');
  });

  test('sets DesiredQuantity and MultiCount when pack qty > 1', () => {
    const result = mergeGrabInfoDescription('Notes', 'Scraped', {}, {}, { desiredQuantity: 5 });
    const parsed = JSON.parse(result);
    expect(parsed.DesiredQuantity).toBe(5);
    expect(parsed.MultiCount).toBe(true);
  });

  test('does not lower an existing higher DesiredQuantity', () => {
    const existing = JSON.stringify({
      Text: 'Old',
      DesiredQuantity: 8,
      MultiCount: true,
    });
    const result = mergeGrabInfoDescription(existing, 'New', {}, {}, { desiredQuantity: 3 });
    const parsed = JSON.parse(result);
    expect(parsed.DesiredQuantity).toBe(8);
  });
});
