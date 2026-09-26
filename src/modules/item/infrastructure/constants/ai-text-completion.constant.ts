/** Default OpenRouter chat-completions endpoint when no custom endpoint is set. */
export const OPENROUTER_CHAT_COMPLETIONS_URL =
  'https://openrouter.ai/api/v1/chat/completions';

export const OPENROUTER_DEFAULT_MODEL = 'google/gemini-2.5-flash';

export const LOCAL_AI_DEFAULT_MODEL = 'llama3';

export const OPENROUTER_EXTRA_HEADERS = {
  'HTTP-Referer': 'http://localhost:3000',
  'X-Title': 'Giftistry',
} as const;
