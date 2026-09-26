import type { AiProvider } from '@/modules/system';
import type { MetadataPopulatorDeltaHandler } from '../types/metadata-populator-delta-handler.type';

export interface MetadataPopulatorConfig {
  provider: AiProvider;
  apiKey: string;
  model: string;
  customPrompt: string;
  endpoint: string;
  linkedDescriptionPrompt?: string;
  linkedCategoryPrompt?: string;
  onDelta?: MetadataPopulatorDeltaHandler;
}
