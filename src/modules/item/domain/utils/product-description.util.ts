import { MARKETING_FLUFF_PATTERNS } from '../constants/marketing-fluff-patterns.constant';

export function isUnusableProductDescription(text: string | null | undefined): boolean {
  const trimmed = text?.trim() ?? '';
  if (!trimmed) return false;
  if (trimmed.length > 300) return true;
  if (/^amazon\.com\s*:/i.test(trimmed)) return true;
  return MARKETING_FLUFF_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export function sanitizeProductDescription(text: string | null | undefined): string | null {
  const trimmed = text?.trim() ?? '';
  if (!trimmed || isUnusableProductDescription(trimmed)) {
    return null;
  }
  return trimmed;
}
