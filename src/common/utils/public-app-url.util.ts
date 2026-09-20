import { timingSafeEqual } from 'crypto';
import { env } from '@/common/consts/runtime-config';

const DEV_FALLBACK = 'http://localhost:3000';

type PublicAppUrlConfigSource = () => string | undefined;

let getConfigPublicAppUrl: PublicAppUrlConfigSource = () => undefined;

/** Wire from composition root: () => serverConfigRepo.load().PublicAppUrl */
export function setPublicAppUrlConfigSource(fn: PublicAppUrlConfigSource): void {
  getConfigPublicAppUrl = fn;
}

/**
 * Resolve the public-facing app URL for emails, WebAuthn, CORS, etc.
 * Precedence: GIFTISTRY_PUBLIC_APP_URL env > config.PublicAppUrl > localhost (dev only).
 */
export function getPublicAppUrl(): string {
  const fromEnv = env.GIFTISTRY_PUBLIC_APP_URL?.replace(/\/$/, '');
  if (fromEnv) {
    return fromEnv;
  }

  const fromConfig = getConfigPublicAppUrl()?.trim().replace(/\/$/, '');
  if (fromConfig) {
    return fromConfig;
  }

  if (!env.isProduction) {
    return DEV_FALLBACK;
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
