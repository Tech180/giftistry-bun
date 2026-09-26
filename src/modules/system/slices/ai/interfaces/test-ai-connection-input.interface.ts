import type { AiProvider } from '../../../domain/types/ai-provider.type';
export interface TestAiConnectionInput {
  AiProvider: AiProvider | string;
  AiEndpoint?: string | null;
  AiApiKey?: string | null;
  AiModel?: string | null;
  /** reachability: list models only. full: also verify model responds. */
  Mode?: 'reachability' | 'full';
}
