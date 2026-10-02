import {
  GIFT_TITLE_HAS_SYMBOL_PATTERN,
  GIFT_TITLE_PIPE_SUFFIX_PATTERN,
} from '../constants/gift-title-normalization.constant';

export function isVerboseProductTitle(title: string | null | undefined): boolean {
  const t = title?.trim() ?? '';
  if (!t) {
    return false;
  }

  if (t.length > 80) {
    return true;
  }

  if (GIFT_TITLE_HAS_SYMBOL_PATTERN.test(t) || GIFT_TITLE_PIPE_SUFFIX_PATTERN.test(t)) {
    return true;
  }

  const dashParts = t.split(/\s[-–—|]\s/);
  if (dashParts.length >= 3) {
    return true;
  }

  const commaParts = t.split(/\s*[,|]\s*/).filter(Boolean);
  if (commaParts.length >= 3) {
    return true;
  }

  return false;
}
