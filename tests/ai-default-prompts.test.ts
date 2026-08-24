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

  test('populate default includes category-agnostic title rules', () => {
    expect(AI_DEFAULT_PROMPTS.populate).toContain('Title rules (critical)');
    expect(AI_DEFAULT_PROMPTS.populate).toContain(
      'short product-facing name without leading brand/author/studio'
    );
    expect(AI_DEFAULT_PROMPTS.populate).toContain(
      'Do NOT put Brand, author names, or studio/distributor'
    );
    expect(AI_DEFAULT_PROMPTS.populate).toContain('JNENERY Needle Felting Kit');
    expect(AI_DEFAULT_PROMPTS.populate).toContain('PredefinedFields.ModelNumber');
    expect(AI_DEFAULT_PROMPTS.populate).not.toMatch(/"Author":/);
    expect(AI_DEFAULT_PROMPTS.populate).not.toMatch(/"Format":/);
    expect(AI_DEFAULT_PROMPTS.populate).not.toContain('Kristin Hannah The Women');
    expect(AI_DEFAULT_PROMPTS.populate).not.toContain('Disney Encanto 4K UHD');
    expect(AI_DEFAULT_PROMPTS.populate).not.toContain('Oura Ring 5');
    expect(AI_DEFAULT_PROMPTS.populate).not.toContain('Solid French Terry Boxy Full-Zip Hoodie');
    expect(AI_DEFAULT_PROMPTS.populate).not.toContain('WH-1000XM5');
  });

  test('populate default keeps ModelNumber guidance without category title examples', () => {
    expect(AI_DEFAULT_PROMPTS.populate).toContain('opaque seller/style/SKU');
    expect(AI_DEFAULT_PROMPTS.populate).toContain('PredefinedFields.ModelNumber');
    expect(AI_DEFAULT_PROMPTS.populate).not.toContain('MS52372');
  });

  test('populate default includes Description rules for item-only notes', () => {
    expect(AI_DEFAULT_PROMPTS.populate).toContain('Description rules (critical)');
    expect(AI_DEFAULT_PROMPTS.populate).toContain('FSA/HSA');
    expect(AI_DEFAULT_PROMPTS.populate).toContain('Soft full-zip hoodie for everyday wear.');
    expect(AI_DEFAULT_PROMPTS.populate).not.toContain('Electronics / gaming');
    expect(AI_DEFAULT_PROMPTS.populate).not.toContain('6G+128G');
    expect(AI_DEFAULT_PROMPTS.populate).not.toMatch(/"RAM":/);
    expect(AI_DEFAULT_PROMPTS.populate).not.toMatch(/"StorageCapacity":/);
  });

  test('import default documents Giftistry export columns and JSON output', () => {
    expect(AI_DEFAULT_PROMPTS.import).toContain('Website Link');
    expect(AI_DEFAULT_PROMPTS.import).toContain('{fileContent}');
    expect(AI_DEFAULT_PROMPTS.import).toContain('"WebsiteLink"');
  });
});
