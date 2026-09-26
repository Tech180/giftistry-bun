import type { AiProvider } from '@/modules/system';

export interface ReviewExtractorConfig {
  provider: AiProvider;
  apiKey: string;
  model: string;
  customPrompt: string;
  endpoint: string;
}
