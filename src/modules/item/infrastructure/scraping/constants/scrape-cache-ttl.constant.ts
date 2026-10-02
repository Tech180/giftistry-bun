import type { FetchOutcomeKind } from '../../../domain/types/fetch-outcome-kind.type';

export const SCRAPE_CACHE_TTL_MS: Partial<Record<FetchOutcomeKind, number>> = {
  ok: 12 * 60 * 60 * 1000,
  blocked: 20 * 60 * 1000,
  'not-found': 60 * 60 * 1000,
  'login-wall': 20 * 60 * 1000,
  'geo-blocked': 20 * 60 * 1000,
};

export const DEFAULT_SCRAPE_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
