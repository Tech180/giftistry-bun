import { CATEGORY_PROMPT } from './category-prompt.constant';
import { DESCRIPTION_PROMPT } from './description-prompt.constant';
import { IMPORT_PROMPT } from './import-prompt.constant';
import { POPULATE_PROMPT } from './populate-prompt.constant';
import { REVIEW_PROMPT } from './review-prompt.constant';

export const AI_DEFAULT_PROMPTS = {
  review: REVIEW_PROMPT,
  description: DESCRIPTION_PROMPT,
  populate: POPULATE_PROMPT,
  category: CATEGORY_PROMPT,
  import: IMPORT_PROMPT,
} as const;
