import { timingSafeEqual } from 'crypto';
import { getEnv } from '@/common/config/utils/get-env.util';
import { PUBLIC_APP_URL_DEV_FALLBACK } from './constants/public-app-url.constant';
import type { PublicAppUrlConfigSource } from './interfaces/public-app-url-config-source.interface';

let getConfigPublicAppUrl: PublicAppUrlConfigSource = () => undefined;

/** Wire from composition root: () => serverConfigRepo.load().PublicAppUrl */
export function setPublicAppUrlConfigSource(fn: PublicAppUrlConfigSource): void {
  getConfigPublicAppUrl = fn;
}

/**
 * Resolve the public-facing app URL for emails, WebAuthn, CORS, etc.
 * Precedence: config.PublicAppUrl > GIFTISTRY_PUBLIC_APP_URL env (bootstrap) > localhost (dev only).
 * Production operators normally set PublicAppUrl via onboarding/admin UI; env applies only when config is unset.
 */
export function getPublicAppUrl(): string {
  const fromConfig = getConfigPublicAppUrl()?.trim().replace(/\/$/, '');
  if (fromConfig) {
    return fromConfig;
  }

  const runtime = getEnv();
  const fromEnv = runtime.GIFTISTRY_PUBLIC_APP_URL?.replace(/\/$/, '');
  if (fromEnv) {
    return fromEnv;
  }

  if (!runtime.isProduction) {
    return PUBLIC_APP_URL_DEV_FALLBACK;
  }

  return '';
}

/** Constant-time compare for setup token. */
export function timingSafeEqualString(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}
