/** Multiplier applied to populate max tokens when the first reply was truncated. */
export const POPULATE_TRUNCATION_RETRY_TOKEN_MULTIPLIER = 1.5;

/** Base token budget assumed when no populate max tokens is configured. */
export const POPULATE_TRUNCATION_RETRY_DEFAULT_BASE_TOKENS = 2_048;

/** Hard cap for the raised retry token budget. */
export const POPULATE_TRUNCATION_RETRY_MAX_TOKENS = 16_384;

/** Max characters of the previous reply echoed into a repair prompt. */
export const POPULATE_REPAIR_PREVIOUS_OUTPUT_MAX_CHARS = 2_000;

/** Max characters of the reply logged when populate parsing fails. */
export const POPULATE_FAILURE_LOG_SNIPPET_CHARS = 200;
