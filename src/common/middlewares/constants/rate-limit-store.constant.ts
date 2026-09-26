import type { RateLimitRecord } from '../interfaces/rate-limit-config.interface';

export const RATE_LIMIT_STORE = new Map<string, RateLimitRecord>();

/** How often expired rate-limit windows are dropped. */
export const RATE_LIMIT_CLEANUP_INTERVAL_MS = 60_000;
