import { Elysia } from 'elysia';
import { AppError } from '@/common/domain/errors/app-error';
import type { RateLimitConfig } from './interfaces/rate-limit-config.interface';
import { checkRateLimit } from './utils/check-rate-limit.util';

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
      try {
        checkRateLimit(key, config);
      } catch (err) {
        if (err instanceof AppError) {
          set.status = err.statusCode;
        }
        throw err;
      }
    });
}
