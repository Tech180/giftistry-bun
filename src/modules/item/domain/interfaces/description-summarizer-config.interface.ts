import type { AiProvider } from '@/modules/system';

export interface DescriptionSummarizerConfig {
  provider: AiProvider;
  apiKey: string;
  model: string;
  customPrompt: string;
  endpoint: string;
}
