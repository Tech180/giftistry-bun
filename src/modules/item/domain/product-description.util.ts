const MARKETING_FLUFF_PATTERNS = [
  /fsa\s*\/\s*hsa/i,
  /sizing kit/i,
  /before you buy/i,
  /at checkout/i,
  /\beligible\b/i,
  /free shipping/i,
  /important\s*:/i,
  /^notice\s*:/i,
  /customs office/i,
  /taxes and duty/i,
  /duty fees/i,
  /final payment does not include/i,
  /shipping calculated at checkout/i,
  /shipping policy/i,
  /return policy/i,
  /terms and conditions/i,
];

export function isUnusableProductDescription(text: string | null | undefined): boolean {
  const trimmed = text?.trim() ?? '';
  if (!trimmed) return false;
  if (trimmed.length > 300) return true;
  return MARKETING_FLUFF_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export function sanitizeProductDescription(text: string | null | undefined): string | null {
  const trimmed = text?.trim() ?? '';
  if (!trimmed || isUnusableProductDescription(trimmed)) {
    return null;
  }
  return trimmed;
}
