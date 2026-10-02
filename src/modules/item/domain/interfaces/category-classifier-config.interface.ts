import type { AiProvider } from '@/modules/system';
import type { AiMetadataExtractionOptions } from '@/modules/system';
import type { CategoryClassifierDeltaHandler } from '../types/category-classifier-delta-handler.type';

export interface CategoryClassifierConfig {
  provider: AiProvider;
  apiKey: string;
  model: string;
  endpoint: string;
  customPrompt: string;
  onDelta?: CategoryClassifierDeltaHandler;
  extractionOptions?: AiMetadataExtractionOptions;
  /** Optional per-request completion timeout cap (ms), e.g. remaining extract budget. */
  timeoutMs?: number;
}
