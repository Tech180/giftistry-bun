import { WEAK_JWT_DEFAULTS } from '../constants/weak-jwt-defaults.constant';

export function assertProductionJwt(
  secret: string | undefined,
  isProduction: boolean
): string {
  const trimmed = secret?.trim() ?? '';
  if (!isProduction) {
    return trimmed || 'local_secret_key_for_giftistry';
  }

  if (!trimmed) {
    throw new Error(
      '[boot] JWT_SECRET is required in production. Set JWT_SECRET, JWT_SECRET_FILE, a credentials-dir file named JWT_SECRET, or allow auto-persist (default) under GIFTISTRY_STATE_DIR/jwt_secret. Set GIFTISTRY_AUTO_JWT_SECRET=false to forbid auto-generation.'
    );
  }

  if (WEAK_JWT_DEFAULTS.has(trimmed) || trimmed.length < 32) {
    throw new Error(
      '[boot] JWT_SECRET in production must be at least 32 characters and must not be a known default. Generate a strong secret.'
    );
  }

  return trimmed;
}
