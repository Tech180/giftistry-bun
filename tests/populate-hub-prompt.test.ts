import { describe, expect, test } from 'bun:test';
import {
  assemblePopulateHubPrompt,
  extractPopulateBodyFromCombined,
  parsePopulateHubPrompt,
  POPULATE_HUB_HEADERS,
} from '../src/modules/item/infrastructure/populate-hub-prompt.util';

describe('populate-hub-prompt.util', () => {
  test('assemblePopulateHubPrompt joins three sections with headers', () => {
    const combined = assemblePopulateHubPrompt(
      'Populate body',
      'Description body',
      'Category body'
    );

    expect(combined).toContain(`${POPULATE_HUB_HEADERS.populate}\nPopulate body`);
    expect(combined).toContain(`${POPULATE_HUB_HEADERS.description}\nDescription body`);
    expect(combined).toContain(`${POPULATE_HUB_HEADERS.category}\nCategory body`);
  });

  test('parsePopulateHubPrompt round-trips assembled bundle', () => {
    const combined = assemblePopulateHubPrompt('P', 'D', 'C');
    expect(parsePopulateHubPrompt(combined)).toEqual({
      populate: 'P',
      description: 'D',
      category: 'C',
    });
  });

  test('extractPopulateBodyFromCombined returns only populate section', () => {
    const combined = assemblePopulateHubPrompt('Only edit me', 'Desc', 'Cat');
    expect(extractPopulateBodyFromCombined(combined)).toBe('Only edit me');
  });

  test('extractPopulateBodyFromCombined falls back when headers missing', () => {
    expect(extractPopulateBodyFromCombined('Legacy populate-only prompt')).toBe(
      'Legacy populate-only prompt'
    );
  });
});
