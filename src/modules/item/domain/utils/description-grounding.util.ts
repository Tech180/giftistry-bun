import {
  DESCRIPTION_GROUNDING_MIN_TOKEN_LENGTH,
  DESCRIPTION_GROUNDING_STOP_WORD_SET,
} from '../constants/description-grounding.constant';

export function descriptionGroundingTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(
      (token) =>
        token.length >= DESCRIPTION_GROUNDING_MIN_TOKEN_LENGTH &&
        !DESCRIPTION_GROUNDING_STOP_WORD_SET.has(token)
    );
}

/**
 * True when the description shares at least one meaningful word with the evidence or scraped
 * title. Descriptions with no meaningful words are not judged.
 */
export function descriptionSupportedByEvidence(
  description: string,
  evidence: string,
  scrapeTitle: string
): boolean {
  const tokens = descriptionGroundingTokens(description);
  if (tokens.length === 0) return true;

  const haystack = new Set(descriptionGroundingTokens(`${evidence}\n${scrapeTitle}`));
  return tokens.some((token) => haystack.has(token));
}
