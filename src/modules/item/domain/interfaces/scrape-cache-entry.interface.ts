import type { FetchOutcomeKind } from '../types/fetch-outcome-kind.type';

export interface ScrapeCacheEntry {
  cacheKey: string;
  outcomeKind: FetchOutcomeKind;
  html?: string;
  finalUrl?: string;
  status?: number;
  capturedJson?: unknown[];
  strategy?: string;
  cachedAt: number;
}
