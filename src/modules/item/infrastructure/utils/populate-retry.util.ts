import {
  POPULATE_FAILURE_LOG_SNIPPET_CHARS,
  POPULATE_REPAIR_PREVIOUS_OUTPUT_MAX_CHARS,
  POPULATE_TRUNCATION_RETRY_DEFAULT_BASE_TOKENS,
  POPULATE_TRUNCATION_RETRY_MAX_TOKENS,
  POPULATE_TRUNCATION_RETRY_TOKEN_MULTIPLIER,
} from '../constants/populate-retry.constant';
import type { PopulateJsonValidationError } from '../errors/populate-json-validation.error';

export function isTruncatedPopulateReply(
  err: PopulateJsonValidationError,
  finishReason: string | undefined
): boolean {
  return err.kind === 'truncated' || finishReason === 'length';
}

export function resolveTruncationRetryMaxTokens(maxTokens: number | null | undefined): number {
  const base = maxTokens ?? POPULATE_TRUNCATION_RETRY_DEFAULT_BASE_TOKENS;
  return Math.min(
    POPULATE_TRUNCATION_RETRY_MAX_TOKENS,
    Math.ceil(base * POPULATE_TRUNCATION_RETRY_TOKEN_MULTIPLIER)
  );
}

export function buildPopulateRepairPrompt(
  prompt: string,
  err: PopulateJsonValidationError,
  previousText: string
): string {
  const previous = previousText.trim().slice(0, POPULATE_REPAIR_PREVIOUS_OUTPUT_MAX_CHARS);
  return `${prompt}\n\nYour previous JSON response failed validation: ${err.message}.\nPrevious response:\n${previous}\n\nReturn ONE corrected, complete JSON object only.`;
}

export function buildPopulateTruncationRetryPrompt(prompt: string): string {
  return `${prompt}\n\nYour previous JSON response was cut off before the object closed. Return ONE complete, compact JSON object only; omit optional fields you are unsure about.`;
}

export function describePopulateFailure(input: {
  err: PopulateJsonValidationError;
  text: string;
  finishReason?: string;
  maxTokens: number | null | undefined;
  model: string;
}): Record<string, unknown> {
  return {
    kind: input.err.kind,
    finishReason: input.finishReason ?? null,
    rawLength: input.text.length,
    maxTokens: input.maxTokens ?? null,
    model: input.model || null,
    snippet: input.text.trim().slice(0, POPULATE_FAILURE_LOG_SNIPPET_CHARS),
  };
}
