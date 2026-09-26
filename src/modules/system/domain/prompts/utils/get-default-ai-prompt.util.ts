import { AI_DEFAULT_PROMPTS } from '../constants/ai-default-prompts.constant';
import type { AiPromptKind } from '../types/ai-prompt-kind.type';

export function getDefaultAiPrompt(kind: AiPromptKind): string {
  return AI_DEFAULT_PROMPTS[kind];
}
