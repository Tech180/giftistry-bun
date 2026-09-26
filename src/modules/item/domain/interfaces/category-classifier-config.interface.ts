import type { AiProvider } from '@/modules/system';
import type { CategoryClassifierDeltaHandler } from '../types/category-classifier-delta-handler.type';

export interface CategoryClassifierConfig {
  provider: AiProvider;
  apiKey: string;
  model: string;
  endpoint: string;
  customPrompt: string;
  onDelta?: CategoryClassifierDeltaHandler;
}
