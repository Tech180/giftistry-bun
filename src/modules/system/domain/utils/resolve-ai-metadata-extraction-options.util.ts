import {
  AI_PAGE_CONTEXT_MAX_CHARS_BY_PRESET,
  AI_POPULATE_MAX_TOKENS_BY_PRESET,
  DEFAULT_AI_METADATA_SPLIT_PACK_CALLS,
} from '../constants/ai-metadata-extraction.constant';
import type { AiMetadataExtractionOptions } from '../interfaces/ai-metadata-extraction-options.interface';
import type { ServerConfig } from '../interfaces/server-config.interface';
import {
  clampAiPageContextMaxChars,
  clampAiPopulateMaxTokens,
} from './clamp-server-config-limits.util';
import { normalizeAiMetadataExtractionPreset } from './normalize-ai-metadata-extraction-preset.util';

type ExtractionConfigSlice = Pick<
  ServerConfig,
  | 'AiMetadataExtractionPreset'
  | 'AiPageContextMaxChars'
  | 'AiPopulateMaxTokens'
  | 'AiMetadataSplitPackCalls'
>;

function resolveOptionalCap(
  raw: number | undefined,
  presetDefault: number | null,
  clamp: (value: unknown) => number
): number | null {
  // 0 means "no cap" (full preset persisted default). Positive = explicit override.
  if (raw != null && raw > 0) {
    return clamp(raw);
  }
  if (raw === 0) {
    return null;
  }
  return presetDefault;
}

export function resolveAiMetadataExtractionOptions(
  config: ExtractionConfigSlice
): AiMetadataExtractionOptions {
  const preset = normalizeAiMetadataExtractionPreset(config.AiMetadataExtractionPreset);
  const promptProfile = preset === 'full' ? 'full' : 'compact';
  const includeCategoryHub = preset === 'full';
  const splitCalls = preset === 'thorough';
  const splitPackCalls =
    splitCalls &&
    (config.AiMetadataSplitPackCalls ?? DEFAULT_AI_METADATA_SPLIT_PACK_CALLS) === true;
  const attachScrapeFactsWhenHighConfidence = preset !== 'full';

  const pageContextMaxChars = resolveOptionalCap(
    config.AiPageContextMaxChars,
    AI_PAGE_CONTEXT_MAX_CHARS_BY_PRESET[preset],
    clampAiPageContextMaxChars
  );
  const populateMaxTokens = resolveOptionalCap(
    config.AiPopulateMaxTokens,
    AI_POPULATE_MAX_TOKENS_BY_PRESET[preset],
    clampAiPopulateMaxTokens
  );

  return {
    preset,
    promptProfile,
    includeCategoryHub,
    splitCalls,
    splitPackCalls,
    pageContextMaxChars,
    populateMaxTokens,
    attachScrapeFactsWhenHighConfidence,
  };
}
