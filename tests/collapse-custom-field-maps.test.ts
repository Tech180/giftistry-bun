import { describe, expect, test } from 'bun:test';
import {
  collapseFieldMap,
  dedupePredefinedVsUserDefined,
  mergeFieldMapsByNormalizedKey,
  normalizeCustomFieldKey,
} from '@/modules/item/domain/utils/collapse-custom-field-maps.util';

describe('normalizeCustomFieldKey', () => {
  test('collapses spaces and case', () => {
    expect(normalizeCustomFieldKey('Form Factor')).toBe('formfactor');
    expect(normalizeCustomFieldKey('FormFactor')).toBe('formfactor');
    expect(normalizeCustomFieldKey('form_factor')).toBe('formfactor');
  });
});

describe('collapseFieldMap', () => {
  test('keeps spaced key and later value on collision', () => {
    const collapsed = collapseFieldMap({
      'Form Factor': 'Desktop',
      FormFactor: 'Desktops',
    });
    expect(Object.keys(collapsed)).toEqual(['Form Factor']);
    expect(collapsed['Form Factor']).toBe('Desktops');
  });

  test('prefers PascalCase when neither key has spaces', () => {
    const collapsed = collapseFieldMap({
      formfactor: 'A',
      FormFactor: 'B',
    });
    expect(collapsed).toEqual({ FormFactor: 'B' });
  });
});

describe('mergeFieldMapsByNormalizedKey', () => {
  test('incoming wins by default', () => {
    const merged = mergeFieldMapsByNormalizedKey(
      { 'Base Clock': '3.4 GHz' },
      { BaseClock: '3.5 GHz' }
    );
    expect(Object.keys(merged)).toHaveLength(1);
    expect(Object.values(merged)[0]).toBe('3.5 GHz');
  });

  test('preferBase keeps base value on collision', () => {
    const merged = mergeFieldMapsByNormalizedKey(
      { PantsSize: '32x30' },
      { PantsSize: '34x32', ShirtSize: 'L' },
      true
    );
    expect(merged.PantsSize).toBe('32x30');
    expect(merged.ShirtSize).toBe('L');
  });
});

describe('dedupePredefinedVsUserDefined', () => {
  test('drops userDefined when label matches predefined', () => {
    const result = dedupePredefinedVsUserDefined(
      { FormFactor: 'Desktop' },
      { 'Form Factor': 'Desktops', Brand: 'AMD' }
    );
    expect(result.predefined).toEqual({ FormFactor: 'Desktop' });
    expect(result.userDefined).toEqual({ Brand: 'AMD' });
  });
});
