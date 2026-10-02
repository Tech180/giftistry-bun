/** Shorter tokens are ignored when checking whether an AI description is supported by evidence. */
export const DESCRIPTION_GROUNDING_MIN_TOKEN_LENGTH = 4;

/** Generic words that say nothing about which product a description is about. */
export const DESCRIPTION_GROUNDING_STOP_WORDS = [
  'with',
  'this',
  'that',
  'your',
  'from',
  'have',
  'item',
  'items',
  'product',
  'products',
  'used',
  'uses',
  'using',
  'great',
  'made',
  'best',
  'gift',
  'ideal',
  'perfect',
  'easy',
  'home',
  'everyday',
  'design',
  'designed',
  'features',
  'quality',
  'premium',
  'beginner',
  'beginners',
  'includes',
  'including',
  'comes',
  'ready',
] as const;

export const DESCRIPTION_GROUNDING_STOP_WORD_SET: ReadonlySet<string> = new Set(
  DESCRIPTION_GROUNDING_STOP_WORDS
);
