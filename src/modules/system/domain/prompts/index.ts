import { REVIEW_PROMPT } from './review';
import { DESCRIPTION_PROMPT } from './description';
import { POPULATE_PROMPT } from './populate';
import { CATEGORY_PROMPT } from './category';
import { IMPORT_PROMPT } from './import';

export const AI_DEFAULT_PROMPTS = {
  review: REVIEW_PROMPT,
  description: DESCRIPTION_PROMPT,
  populate: POPULATE_PROMPT,
  category: CATEGORY_PROMPT,
  import: IMPORT_PROMPT,
} as const;

export type AiPromptKind = keyof typeof AI_DEFAULT_PROMPTS;

export function getDefaultAiPrompt(kind: AiPromptKind): string {
  return AI_DEFAULT_PROMPTS[kind];
}

export {
  REVIEW_PROMPT,
  DESCRIPTION_PROMPT,
  POPULATE_PROMPT,
  CATEGORY_PROMPT,
  IMPORT_PROMPT,
};
