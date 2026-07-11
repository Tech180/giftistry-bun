import { describe, expect, test } from 'bun:test';
import { toSystemSettingsView } from '../src/modules/system/domain/server-config.entity';
import { AI_DEFAULT_PROMPTS } from '../src/modules/item/infrastructure/ai-default-prompts';

describe('toSystemSettingsView aiDefaultPrompts', () => {
  test('includes canonical defaults for all four prompt kinds', () => {
    const view = toSystemSettingsView({
      dbType: 'local',
      smtpType: 'local',
    });

    expect(view.aiDefaultPrompts.review).toBe(AI_DEFAULT_PROMPTS.review);
    expect(view.aiDefaultPrompts.description).toBe(AI_DEFAULT_PROMPTS.description);
    expect(view.aiDefaultPrompts.populate).toBe(AI_DEFAULT_PROMPTS.populate);
    expect(view.aiDefaultPrompts.category).toBe(AI_DEFAULT_PROMPTS.category);
  });

  test('returns saved prompt overrides separately from defaults', () => {
    const view = toSystemSettingsView({
      dbType: 'local',
      smtpType: 'local',
      aiPopulatePrompt: 'Custom populate prompt',
    });

    expect(view.aiPopulatePrompt).toBe('Custom populate prompt');
    expect(view.aiDefaultPrompts.populate).toBe(AI_DEFAULT_PROMPTS.populate);
  });
});
