import type { AiMetadataExtractionPreset } from '../types/ai-metadata-extraction-preset.type';

export type AiMetadataPromptProfile = 'full' | 'compact';

export interface AiMetadataExtractionOptions {
  preset: AiMetadataExtractionPreset;
  promptProfile: AiMetadataPromptProfile;
  includeCategoryHub: boolean;
  splitCalls: boolean;
  splitPackCalls: boolean;
  /** null = no cap (full preset). */
  pageContextMaxChars: number | null;
  /** null = omit max_tokens (full preset). */
  populateMaxTokens: number | null;
  attachScrapeFactsWhenHighConfidence: boolean;
}
