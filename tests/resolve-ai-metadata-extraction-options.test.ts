import { describe, expect, test } from 'bun:test';
import {
  AI_PAGE_CONTEXT_MAX_CHARS_BY_PRESET,
  AI_POPULATE_MAX_TOKENS_BY_PRESET,
  clampAiPageContextMaxChars,
  clampAiPopulateMaxTokens,
  DEFAULT_AI_METADATA_EXTRACTION_PRESET,
  resolveAiMetadataExtractionOptions,
  toSystemSettingsView,
} from '../src/modules/system';
import {
  AI_PAGE_CONTEXT_MAX_CHARS_MAX,
  AI_PAGE_CONTEXT_MAX_CHARS_MIN,
  AI_POPULATE_MAX_TOKENS_MAX,
  AI_POPULATE_MAX_TOKENS_MIN,
} from '../src/modules/system/domain/constants/ai-metadata-extraction.constant';

describe('resolveAiMetadataExtractionOptions', () => {
  test('defaults to full with full hub and no caps', () => {
    const options = resolveAiMetadataExtractionOptions({});
    expect(options.preset).toBe(DEFAULT_AI_METADATA_EXTRACTION_PRESET);
    expect(options.promptProfile).toBe('full');
    expect(options.includeCategoryHub).toBe(true);
    expect(options.splitCalls).toBe(false);
    expect(options.splitPackCalls).toBe(false);
    expect(options.pageContextMaxChars).toBeNull();
    expect(options.populateMaxTokens).toBeNull();
    expect(options.attachScrapeFactsWhenHighConfidence).toBe(false);
  });

  test('fast uses compact prompt, aggressive caps, no split', () => {
    const options = resolveAiMetadataExtractionOptions({
      AiMetadataExtractionPreset: 'fast',
    });
    expect(options.promptProfile).toBe('compact');
    expect(options.includeCategoryHub).toBe(false);
    expect(options.splitCalls).toBe(false);
    expect(options.pageContextMaxChars).toBe(AI_PAGE_CONTEXT_MAX_CHARS_BY_PRESET.fast);
    expect(options.populateMaxTokens).toBe(AI_POPULATE_MAX_TOKENS_BY_PRESET.fast);
    expect(options.attachScrapeFactsWhenHighConfidence).toBe(true);
  });

  test('balanced uses compact with moderate caps', () => {
    const options = resolveAiMetadataExtractionOptions({
      AiMetadataExtractionPreset: 'balanced',
    });
    expect(options.pageContextMaxChars).toBe(AI_PAGE_CONTEXT_MAX_CHARS_BY_PRESET.balanced);
    expect(options.populateMaxTokens).toBe(AI_POPULATE_MAX_TOKENS_BY_PRESET.balanced);
    expect(options.splitCalls).toBe(false);
  });

  test('thorough enables split calls; splitPackCalls only when configured', () => {
    expect(
      resolveAiMetadataExtractionOptions({
        AiMetadataExtractionPreset: 'thorough',
      }).splitPackCalls
    ).toBe(false);
    expect(
      resolveAiMetadataExtractionOptions({
        AiMetadataExtractionPreset: 'thorough',
        AiMetadataSplitPackCalls: true,
      }).splitPackCalls
    ).toBe(true);
    expect(
      resolveAiMetadataExtractionOptions({
        AiMetadataExtractionPreset: 'balanced',
        AiMetadataSplitPackCalls: true,
      }).splitPackCalls
    ).toBe(false);
  });

  test('positive overrides are clamped; 0 means no cap', () => {
    expect(
      resolveAiMetadataExtractionOptions({
        AiMetadataExtractionPreset: 'fast',
        AiPageContextMaxChars: 999_999,
      }).pageContextMaxChars
    ).toBe(AI_PAGE_CONTEXT_MAX_CHARS_MAX);
    expect(
      resolveAiMetadataExtractionOptions({
        AiMetadataExtractionPreset: 'fast',
        AiPageContextMaxChars: 0,
      }).pageContextMaxChars
    ).toBeNull();
    expect(
      resolveAiMetadataExtractionOptions({
        AiMetadataExtractionPreset: 'full',
        AiPopulateMaxTokens: 512,
      }).populateMaxTokens
    ).toBe(512);
  });
});

describe('ai metadata extraction clamps', () => {
  test('clampAiPageContextMaxChars', () => {
    expect(clampAiPageContextMaxChars(0)).toBe(AI_PAGE_CONTEXT_MAX_CHARS_MIN);
    expect(clampAiPageContextMaxChars(999_999)).toBe(AI_PAGE_CONTEXT_MAX_CHARS_MAX);
    expect(clampAiPageContextMaxChars(2000)).toBe(2000);
  });

  test('clampAiPopulateMaxTokens', () => {
    expect(clampAiPopulateMaxTokens(1)).toBe(AI_POPULATE_MAX_TOKENS_MIN);
    expect(clampAiPopulateMaxTokens(999_999)).toBe(AI_POPULATE_MAX_TOKENS_MAX);
    expect(clampAiPopulateMaxTokens(2048)).toBe(2048);
  });
});

describe('toSystemSettingsView metadata extraction', () => {
  test('defaults to full with null caps', () => {
    const view = toSystemSettingsView({ DbType: 'local', SmtpType: 'local' });
    expect(view.AiMetadataExtractionPreset).toBe('full');
    expect(view.AiPageContextMaxChars).toBeNull();
    expect(view.AiPopulateMaxTokens).toBeNull();
    expect(view.AiMetadataSplitPackCalls).toBe(false);
  });

  test('exposes resolved fast preset values', () => {
    const view = toSystemSettingsView({
      DbType: 'local',
      SmtpType: 'local',
      AiMetadataExtractionPreset: 'fast',
      AiMetadataSplitPackCalls: true,
    });
    expect(view.AiMetadataExtractionPreset).toBe('fast');
    expect(view.AiPageContextMaxChars).toBe(AI_PAGE_CONTEXT_MAX_CHARS_BY_PRESET.fast);
    expect(view.AiPopulateMaxTokens).toBe(AI_POPULATE_MAX_TOKENS_BY_PRESET.fast);
    expect(view.AiMetadataSplitPackCalls).toBe(true);
  });
});
