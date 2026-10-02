import type { AiMetadataExtractionPreset } from '../types/ai-metadata-extraction-preset.type';

export const DEFAULT_AI_METADATA_EXTRACTION_PRESET: AiMetadataExtractionPreset = 'full';

export const AI_METADATA_EXTRACTION_PRESETS = [
  'full',
  'fast',
  'balanced',
  'thorough',
] as const satisfies readonly AiMetadataExtractionPreset[];

/** Page context char caps when settings omit AiPageContextMaxChars. */
export const AI_PAGE_CONTEXT_MAX_CHARS_BY_PRESET: Record<
  AiMetadataExtractionPreset,
  number | null
> = {
  full: null,
  fast: 2_000,
  balanced: 4_000,
  thorough: 4_000,
};

/** Completion token caps when settings omit AiPopulateMaxTokens. */
export const AI_POPULATE_MAX_TOKENS_BY_PRESET: Record<
  AiMetadataExtractionPreset,
  number | null
> = {
  full: null,
  fast: 2_048,
  balanced: 4_096,
  thorough: 4_096,
};

export const AI_PAGE_CONTEXT_MAX_CHARS_MIN = 500;
export const AI_PAGE_CONTEXT_MAX_CHARS_MAX = 50_000;
export const DEFAULT_AI_PAGE_CONTEXT_MAX_CHARS = 4_000;

export const AI_POPULATE_MAX_TOKENS_MIN = 256;
export const AI_POPULATE_MAX_TOKENS_MAX = 16_384;
export const DEFAULT_AI_POPULATE_MAX_TOKENS = 4_096;

export const DEFAULT_AI_METADATA_SPLIT_PACK_CALLS = false;
