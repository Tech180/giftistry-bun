import { describe, expect, test } from 'bun:test';
import { formatSuggestionForExport } from './format-suggestion-for-export.util';

const baseItem = {
  Id: '1',
  Name: 'Gift',
  Category: 'Fun',
  Description: '',
};

describe('formatSuggestionForExport', () => {
  test('returns empty for owner and collaborator', () => {
    const item = { ...baseItem, IsSuggestion: true, SuggestedByUsername: 'sam' };
    expect(formatSuggestionForExport(item, 'owner')).toBe('');
    expect(formatSuggestionForExport(item, 'collaborator')).toBe('');
  });

  test('returns suggester label for viewer suggestion items', () => {
    const item = { ...baseItem, IsSuggestion: true, SuggestedByUsername: 'sam' };
    expect(formatSuggestionForExport(item, 'viewer')).toBe('sam');
  });

  test('returns hidden suggestion label for viewer hidden ideas', () => {
    const item = { ...baseItem, IsHiddenIdea: true };
    expect(formatSuggestionForExport(item, 'viewer')).toBe('Hidden suggestion');
  });
});
