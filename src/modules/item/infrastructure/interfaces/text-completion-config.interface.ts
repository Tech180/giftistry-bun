import type { AiProvider } from '@/modules/system';

export interface TextCompletionConfig {
  provider: AiProvider;
  apiKey: string;
  model: string;
  endpoint: string;
  jsonResponse?: boolean;
  /** Override default completion timeout (ms). */
  timeoutMs?: number;
  /** Override default connect timeout (ms). */
  connectTimeoutMs?: number;
  /** Max completion tokens when the provider supports it. */
  maxTokens?: number;
}
