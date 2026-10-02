import {
  AI_METADATA_EXTRACTION_PRESETS,
  DEFAULT_AI_METADATA_EXTRACTION_PRESET,
} from '../constants/ai-metadata-extraction.constant';
import type { AiMetadataExtractionPreset } from '../types/ai-metadata-extraction-preset.type';

export function normalizeAiMetadataExtractionPreset(
  value: unknown
): AiMetadataExtractionPreset {
  if (typeof value !== 'string') {
    return DEFAULT_AI_METADATA_EXTRACTION_PRESET;
  }

  const trimmed = value.trim().toLowerCase();
  if ((AI_METADATA_EXTRACTION_PRESETS as readonly string[]).includes(trimmed)) {
    return trimmed as AiMetadataExtractionPreset;
  }

  return DEFAULT_AI_METADATA_EXTRACTION_PRESET;
}
