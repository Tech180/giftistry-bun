import {
  RATE_LIMIT_CLEANUP_INTERVAL_MS,
  RATE_LIMIT_STORE,
} from '../constants/rate-limit-store.constant';

export function pruneExpiredRateLimits(now = Date.now()): void {
  for (const [key, value] of RATE_LIMIT_STORE.entries()) {
    if (now > value.resetTime) {
      RATE_LIMIT_STORE.delete(key);
    }
  }
}

setInterval(() => {
  pruneExpiredRateLimits();
}, RATE_LIMIT_CLEANUP_INTERVAL_MS);
