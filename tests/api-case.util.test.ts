import { describe, expect, test } from 'bun:test';
import { toPascalCaseKey, pascalizeKeys } from '../src/common/utils/api-case.util';

describe('api-case.util', () => {
  test('toPascalCaseKey converts camelCase', () => {
    expect(toPascalCaseKey('firstName')).toBe('FirstName');
    expect(toPascalCaseKey('authenticationResponse')).toBe('AuthenticationResponse');
  });

  test('toPascalCaseKey converts kebab-case', () => {
    expect(toPascalCaseKey('text-muted')).toBe('TextMuted');
  });

  test('toPascalCaseKey preserves already PascalCase keys', () => {
    expect(toPascalCaseKey('Id')).toBe('Id');
    expect(toPascalCaseKey('URL')).toBe('URL');
  });

  test('pascalizeKeys recursively converts object keys', () => {
    expect(pascalizeKeys({ firstName: 'Jane', nested: { linkUrl: 'x' } })).toEqual({
      FirstName: 'Jane',
      Nested: { LinkUrl: 'x' },
    });
  });

  test('pascalizeKeys leaves primitives and dates unchanged', () => {
    const date = new Date('2024-01-01');
    expect(pascalizeKeys('hello')).toBe('hello');
    expect(pascalizeKeys(date)).toBe(date);
    expect(pascalizeKeys(null)).toBe(null);
  });
});
