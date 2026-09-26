import type { AiProvider } from '@/modules/system';

export interface ResolvedAiConnection {
  provider: AiProvider;
  endpoint: string;
  apiKey: string;
  model: string;
}
