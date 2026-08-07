import { describe, expect, test } from 'bun:test';
import {
  AI_DEFAULT_PROMPTS,
  getDefaultAiPrompt,
  type AiPromptKind,
} from '../src/modules/system/domain/prompts';

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
    expect(AI_DEFAULT_PROMPTS.populate).toContain('Dyson V11 Cordless Vacuum Cleaner');
    expect(AI_DEFAULT_PROMPTS.populate).toContain('Brand + model/line + short product type');
  });

  test('populate default strips opaque seller SKUs like MS52372 into ModelNumber', () => {
    expect(AI_DEFAULT_PROMPTS.populate).toContain('MS52372');
    expect(AI_DEFAULT_PROMPTS.populate).toContain('mosanana Oval Cat Eye Sunglasses');
    expect(AI_DEFAULT_PROMPTS.populate).toContain('opaque seller/style/SKU');
    expect(AI_DEFAULT_PROMPTS.populate).toContain('PredefinedFields.ModelNumber');
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
