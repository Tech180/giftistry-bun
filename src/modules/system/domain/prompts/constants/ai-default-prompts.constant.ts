import { CATEGORY_PROMPT } from './category-prompt.constant';
import { CATEGORY_PROMPT_COMPACT } from './category-prompt-compact.constant';
import { DESCRIPTION_PROMPT } from './description-prompt.constant';
import { IMPORT_PROMPT } from './import-prompt.constant';
import { POPULATE_PROMPT } from './populate-prompt.constant';
import { POPULATE_PROMPT_COMPACT } from './populate-prompt-compact.constant';
import { REVIEW_PROMPT } from './review-prompt.constant';

export const AI_DEFAULT_PROMPTS = {
  review: REVIEW_PROMPT,
  description: DESCRIPTION_PROMPT,
  populate: POPULATE_PROMPT,
  populateCompact: POPULATE_PROMPT_COMPACT,
  category: CATEGORY_PROMPT,
  categoryCompact: CATEGORY_PROMPT_COMPACT,
  import: IMPORT_PROMPT,
} as const;
