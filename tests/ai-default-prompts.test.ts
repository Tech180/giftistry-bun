import { describe, expect, test } from 'bun:test';
import {
  AI_DEFAULT_PROMPTS,
  getDefaultAiPrompt,
  type AiPromptKind,
} from '../src/modules/item/infrastructure/ai-default-prompts';

const PROMPT_KINDS: AiPromptKind[] = ['review', 'description', 'populate', 'category'];

describe('ai-default-prompts', () => {
  test('exports non-empty defaults for all four prompt kinds', () => {
    for (const kind of PROMPT_KINDS) {
      expect(AI_DEFAULT_PROMPTS[kind].trim().length).toBeGreaterThan(0);
      expect(getDefaultAiPrompt(kind)).toBe(AI_DEFAULT_PROMPTS[kind]);
    }
  });

  test('populate default includes Oura Ring title-cleaning rules', () => {
    expect(AI_DEFAULT_PROMPTS.populate).toContain('Oura Ring 5');
    expect(AI_DEFAULT_PROMPTS.populate).toContain('Title rules (critical)');
  });
});
