import { AppError } from '@/common/domain/errors/app-error';
import { RATE_LIMIT_STORE } from '../constants/rate-limit-store.constant';
import type { RateLimitConfig } from '../interfaces/rate-limit-config.interface';
import './prune-expired-rate-limits.util';

export function checkRateLimit(key: string, config: Pick<RateLimitConfig, 'windowMs' | 'max'>): void {
  const now = Date.now();
  const record = RATE_LIMIT_STORE.get(key);

  if (!record || now > record.resetTime) {
    RATE_LIMIT_STORE.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return;
  }

  if (record.count >= config.max) {
    throw new AppError('Too many requests. Please try again later.', 429, 'TOO_MANY_REQUESTS', {
      Timeframe: '60s',
    });
  }

  record.count++;
}
