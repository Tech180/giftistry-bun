import { Elysia } from 'elysia';
import { AppError } from './error.middleware';

interface RateLimitConfig {
  windowMs: number;
  max: number;
  paths?: string[];
  /** When true, skipped if isAiRateLimitEnabled returns false */
  respectAiRateLimitToggle?: boolean;
  /** Required when respectAiRateLimitToggle is true */
  isAiRateLimitEnabled?: () => boolean;
}

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000);

export function checkRateLimit(key: string, config: Pick<RateLimitConfig, 'windowMs' | 'max'>): void {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, {
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

export function rateLimit(config: RateLimitConfig) {
  const paths = config.paths ?? ['/signup', '/login'];

  return new Elysia()
    .onBeforeHandle({ as: 'global' }, ({ request, set }) => {
      const path = new URL(request.url).pathname;
      if (!paths.some((p) => path.endsWith(p))) {
        return;
      }

      if (config.respectAiRateLimitToggle) {
        if (config.isAiRateLimitEnabled?.() === false) {
          return;
        }
      }

      const isTest = process.env.NODE_ENV === 'test';
      const forceTestLimit = request.headers.get('x-test-rate-limit') === 'true';
      if (isTest && !forceTestLimit) {
        return;
      }

      const ip =
        request.headers.get('x-forwarded-for') ||
        request.headers.get('x-real-ip') ||
        '127.0.0.1';

      const key = `${ip}:${path}`;
      const now = Date.now();

      const record = rateLimitStore.get(key);
      if (!record || now > record.resetTime) {
        rateLimitStore.set(key, {
          count: 1,
          resetTime: now + config.windowMs,
        });
        return;
      }

      if (record.count >= config.max) {
        set.status = 429;
        throw new AppError('Too many requests. Please try again later.', 429, 'TOO_MANY_REQUESTS', {
          Timeframe: '60s',
        });
      }

      record.count++;
    });
}
