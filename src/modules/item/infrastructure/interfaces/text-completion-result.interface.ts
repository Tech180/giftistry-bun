import type { TextCompletionUsage } from './text-completion-usage.interface';
export interface TextCompletionResult {
  text: string;
  usage: TextCompletionUsage;
}
