import { describe, expect, test } from 'bun:test';
import {
  mergeGrabInfoDescription,
  mergeGrabInfoMetadata,
} from '@/modules/jobs/application/utils/merge-grab-info-description.util';

describe('mergeGrabInfoMetadata', () => {
  test('returns structured metadata without serializing', () => {
    const result = mergeGrabInfoMetadata('Imported notes', 'Scraped notes', {
      Color: 'Blue',
    }, { Material: 'Cotton' });

    expect(result.text).toBe('Scraped notes');
    expect(result.metadata).toMatchObject({
      Text: 'Scraped notes',
      CustomFields: {
        Predefined: { Color: 'Blue' },
        UserDefined: { Material: 'Cotton' },
      },
    });
  });

  test('preserves column-backed IsFavorite when description is plain text', () => {
    const result = mergeGrabInfoMetadata(
      'Plain notes',
      'Scraped notes',
      { Color: 'Green' },
      {},
      {
        existingMetadata: {
          Text: 'Plain notes',
          IsFavorite: true,
          CustomFields: { Predefined: { Color: 'Red' }, UserDefined: {} },
        },
      }
    );

    expect(result.text).toBe('Scraped notes');
    expect(result.metadata?.IsFavorite).toBe(true);
    expect(result.metadata?.CustomFields?.Predefined?.Color).toBe('Green');
  });

  test('returns null metadata when nothing to persist', () => {
    const result = mergeGrabInfoMetadata('Notes', 'Scraped', {}, {});
    expect(result).toEqual({ text: 'Scraped', metadata: null });
  });
});

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

  test('collapses Form Factor and FormFactor into one userDefined field', () => {
    const existing = JSON.stringify({
      Text: 'CPU',
      CustomFields: {
        Predefined: {},
        UserDefined: { 'Form Factor': 'Desktop' },
      },
    });
    const result = mergeGrabInfoDescription(existing, 'CPU', {}, {
      FormFactor: 'Desktops',
    });
    const parsed = JSON.parse(result);
    const userDefined = parsed.CustomFields.UserDefined as Record<string, string>;
    expect(Object.keys(userDefined)).toHaveLength(1);
    expect(Object.values(userDefined)[0]).toBe('Desktops');
  });

  test('collapses Base Clock and BaseClock', () => {
    const existing = JSON.stringify({
      Text: 'CPU',
      CustomFields: {
        Predefined: {},
        UserDefined: { 'Base Clock': '3.4 GHz' },
      },
    });
    const result = mergeGrabInfoDescription(existing, 'CPU', {}, {
      BaseClock: '3.5 GHz',
    });
    const parsed = JSON.parse(result);
    const userDefined = parsed.CustomFields.UserDefined as Record<string, string>;
    expect(Object.keys(userDefined)).toHaveLength(1);
    expect(Object.values(userDefined)[0]).toBe('3.5 GHz');
  });

  test('drops userDefined Form Factor when predefined FormFactor exists', () => {
    const result = mergeGrabInfoDescription(
      'CPU',
      'CPU',
      { FormFactor: 'Desktop' },
      { 'Form Factor': 'Desktops', Brand: 'AMD' }
    );
    const parsed = JSON.parse(result);
    expect(parsed.CustomFields.Predefined.FormFactor).toBe('Desktop');
    expect(parsed.CustomFields.UserDefined).toEqual({ Brand: 'AMD' });
  });
});
