import type { TextCompletionDelta } from './text-completion-delta.interface';
export type TextCompletionDeltaHandler = (
  delta: TextCompletionDelta
) => void | Promise<void>;
