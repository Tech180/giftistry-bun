import { describe, expect, test } from 'bun:test';
import {
  AI_DEFAULT_PROMPTS,
  getDefaultAiPrompt,
  type AiPromptKind,
} from '../src/modules/system/domain/ai-default-prompts';

const PROMPT_KINDS: AiPromptKind[] = ['review', 'description', 'populate', 'category', 'import'];

describe('ai-default-prompts', () => {
  test('exports non-empty defaults for all five prompt kinds', () => {
    for (const kind of PROMPT_KINDS) {
      expect(AI_DEFAULT_PROMPTS[kind].trim().length).toBeGreaterThan(0);
      expect(getDefaultAiPrompt(kind)).toBe(AI_DEFAULT_PROMPTS[kind]);
    }
  });

  test('populate default includes Oura Ring title-cleaning rules', () => {
    expect(AI_DEFAULT_PROMPTS.populate).toContain('Oura Ring 5');
    expect(AI_DEFAULT_PROMPTS.populate).toContain('Title rules (critical)');
  });

  test('populate default includes Description rules for item-only notes', () => {
    expect(AI_DEFAULT_PROMPTS.populate).toContain('Description rules (critical)');
    expect(AI_DEFAULT_PROMPTS.populate).toContain('FSA/HSA');
    expect(AI_DEFAULT_PROMPTS.populate).toContain('Compact Android gaming handheld for portable play.');
  });

  test('import default documents Giftistry export columns and JSON output', () => {
    expect(AI_DEFAULT_PROMPTS.import).toContain('Website Link');
    expect(AI_DEFAULT_PROMPTS.import).toContain('{fileContent}');
    expect(AI_DEFAULT_PROMPTS.import).toContain('"WebsiteLink"');
  });
});
