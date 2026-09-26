import type { AiProvider } from '@/modules/system';

export interface ItemImportParserConfig {
  provider: AiProvider;
  apiKey: string;
  model: string;
  customPrompt: string;
  endpoint: string;
  /** When false, send the full file in one AI call. Default true. */
  chunkingEnabled?: boolean;
  /** Max candidate item rows per AI import chunk when chunking is enabled. */
  chunkItemLimit?: number;
}
