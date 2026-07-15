import { describe, expect, test } from 'bun:test';
import { toSystemSettingsView } from '../src/modules/system/domain/server-config.entity';
import { AI_DEFAULT_PROMPTS } from '../src/modules/system/domain/ai-default-prompts';

describe('toSystemSettingsView aiDefaultPrompts', () => {
  test('includes canonical defaults for all five prompt kinds', () => {
    const view = toSystemSettingsView({
      DbType: 'local',
      SmtpType: 'local',
    });

    expect(view.AiDefaultPrompts.Review).toBe(AI_DEFAULT_PROMPTS.review);
    expect(view.AiDefaultPrompts.Description).toBe(AI_DEFAULT_PROMPTS.description);
    expect(view.AiDefaultPrompts.Populate).toBe(AI_DEFAULT_PROMPTS.populate);
    expect(view.AiDefaultPrompts.Category).toBe(AI_DEFAULT_PROMPTS.category);
    expect(view.AiDefaultPrompts.Import).toBe(AI_DEFAULT_PROMPTS.import);
  });

  test('returns saved prompt overrides separately from defaults', () => {
    const view = toSystemSettingsView({
      DbType: 'local',
      SmtpType: 'local',
      AiPopulatePrompt: 'Custom populate prompt',
      AiImportPrompt: 'Custom import prompt',
    });

    expect(view.AiPopulatePrompt).toBe('Custom populate prompt');
    expect(view.AiDefaultPrompts.Populate).toBe(AI_DEFAULT_PROMPTS.populate);
    expect(view.AiImportPrompt).toBe('Custom import prompt');
    expect(view.AiDefaultPrompts.Import).toBe(AI_DEFAULT_PROMPTS.import);
  });
});
