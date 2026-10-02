import {
  GIFT_TITLE_LEADING_FLUFF,
  GIFT_TITLE_PIPE_SUFFIX_PATTERN,
  GIFT_TITLE_SYMBOL_PATTERN,
  GIFT_TITLE_TRAILING_PRODUCT_TYPES,
} from '../constants/gift-title-normalization.constant';
import { compactGiftTitle } from './compact-gift-title.util';
import { isVerboseProductTitle } from './is-verbose-product-title.util';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const LEADING_FLUFF_PATTERNS = GIFT_TITLE_LEADING_FLUFF.map(
  (phrase) => new RegExp(`^${escapeRegExp(phrase)}\\s+`, 'i')
);

const TRAILING_TYPE_PATTERNS = GIFT_TITLE_TRAILING_PRODUCT_TYPES.map(
  (phrase) => new RegExp(`\\s+${escapeRegExp(phrase)}$`, 'i')
);

function wordCount(text: string): number {
  return text.split(' ').filter(Boolean).length;
}

function stripLeadingFluff(title: string): string {
  let result = title;
  for (const pattern of LEADING_FLUFF_PATTERNS) {
    const stripped = result.replace(pattern, '');
    if (stripped !== result && stripped.length > 0) {
      result = stripped;
    }
  }
  return result;
}

function stripTrailingProductType(title: string): string {
  for (const pattern of TRAILING_TYPE_PATTERNS) {
    const stripped = title.replace(pattern, '');
    if (stripped !== title && wordCount(stripped) >= 2) {
      return stripped;
    }
  }
  return title;
}

/**
 * Turn a retailer page title into a short gift-list name: removes emoji, drops pipe-separated
 * store suffixes, compacts SEO laundry lists, and trims generic marketing words around the
 * product identity. Idempotent.
 */
export function normalizeGiftFacingTitle(title: string | null | undefined): string {
  let result = (title ?? '').replace(GIFT_TITLE_SYMBOL_PATTERN, '').replace(/\s+/g, ' ').trim();
  if (!result) return '';

  result = result.split(GIFT_TITLE_PIPE_SUFFIX_PATTERN)[0]?.trim() || result;

  if (isVerboseProductTitle(result)) {
    result = compactGiftTitle(result) || result;
  }

  return stripTrailingProductType(stripLeadingFluff(result));
}
