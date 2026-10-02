import type { TextCompletionUsage } from './text-completion-usage.interface';
export interface TextCompletionResult {
  text: string;
  usage: TextCompletionUsage;
  /** Provider finish reason (e.g. `stop`, `length`) when reported. */
  finishReason?: string;
}
