import type { ResolveProductCandidateHints } from '../interfaces/resolve-product-candidate-hints.interface';
import type { ResolvedProductCandidate } from '../interfaces/resolved-product-candidate.interface';
import type { ProductCandidate } from '../interfaces/product-candidate.interface';
import { PRODUCT_CANDIDATE_TOKEN_SPLIT } from '../constants/product-candidate-token-split.constant';

function tokenize(value: string): Set<string> {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return new Set();
  }
  return new Set(normalized.split(PRODUCT_CANDIDATE_TOKEN_SPLIT).filter((t) => t.length > 1));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) {
    return 1;
  }
  if (a.size === 0 || b.size === 0) {
    return 0;
  }
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) {
      intersection += 1;
    }
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function slugTokensFromUrl(url: string): string[] {
  try {
    const path = new URL(url).pathname;
    return path
      .split('/')
      .flatMap((segment) => segment.split(PRODUCT_CANDIDATE_TOKEN_SPLIT))
      .map((t) => t.toLowerCase())
      .filter((t) => t.length > 2);
  } catch {
    return [];
  }
}

function referenceTokens(hints: ResolveProductCandidateHints, url?: string): Set<string> {
  const merged = new Set<string>();
  for (const part of [hints.h1, hints.ogTitle, hints.pageTitle]) {
    if (part?.trim()) {
      for (const t of tokenize(part)) {
        merged.add(t);
      }
    }
  }
  for (const t of hints.slugTokens ?? []) {
    merged.add(t.toLowerCase());
  }
  if (merged.size === 0 && url) {
    for (const t of slugTokensFromUrl(url)) {
      merged.add(t);
    }
  }
  return merged;
}

function candidateTokens(candidate: ProductCandidate): Set<string> {
  const name = candidate.name?.trim() ?? '';
  const tokens = tokenize(name);
  if (candidate.description?.trim()) {
    for (const t of tokenize(candidate.description)) {
      tokens.add(t);
    }
  }
  return tokens;
}

function offerBonus(candidate: ProductCandidate): number {
  const offers = candidate.offers ?? [];
  if (offers.length === 0) {
    return 0;
  }
  const priced = offers.filter((o) => Number.isFinite(o.price) && o.price > 0);
  return priced.length > 0 ? 0.15 : 0.05;
}

function mainContentBonus(candidate: ProductCandidate, mainContent?: string | null): number {
  if (!mainContent?.trim() || !candidate.name?.trim()) {
    return 0;
  }
  const hay = mainContent.toLowerCase();
  const name = candidate.name.trim().toLowerCase();
  if (hay.includes(name)) {
    return 0.1;
  }
  const words = name.split(PRODUCT_CANDIDATE_TOKEN_SPLIT).filter((w) => w.length > 3);
  if (words.length === 0) {
    return 0;
  }
  const hits = words.filter((w) => hay.includes(w)).length;
  return hits / words.length >= 0.5 ? 0.05 : 0;
}

/**
 * Pick a single product candidate by token overlap with page title signals,
 * offers presence, and main-content mention.
 */
export function resolveProductCandidate(
  candidates: ProductCandidate[],
  hints: ResolveProductCandidateHints,
  url?: string
): ResolvedProductCandidate | null {
  if (candidates.length === 0) {
    return null;
  }
  if (candidates.length === 1) {
    return { candidate: candidates[0]!, score: 1 };
  }

  const ref = referenceTokens(hints, url);
  let best: ResolvedProductCandidate | null = null;

  for (const candidate of candidates) {
    const overlap = jaccard(ref, candidateTokens(candidate));
    const score =
      overlap + offerBonus(candidate) + mainContentBonus(candidate, hints.mainContentText);
    if (!best || score > best.score) {
      best = { candidate, score };
    }
  }

  return best;
}
