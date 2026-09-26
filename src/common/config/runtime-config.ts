import type { SecretSource } from '@/common/domain/ports/secret-source.port';
import { getSecretSource } from '@/common/infrastructure/secrets';
import { ensurePersistedJwtSecret } from '@/common/infrastructure/secrets/ensure-jwt-secret';
import type { RuntimeConfig } from './interfaces/runtime-config.interface';
import { assertProductionJwt } from './utils/assert-production-jwt.util';
import { parseBool } from './utils/parse-bool.util';

/** Build typed runtime config from SecretSource + non-secret Bun.env. Call once at boot. */
export function loadRuntimeConfig(secrets: SecretSource = getSecretSource()): RuntimeConfig {
  const NODE_ENV = Bun.env.NODE_ENV || 'development';
  const isProduction = NODE_ENV === 'production';

  const resolvedJwt = isProduction
    ? ensurePersistedJwtSecret(secrets.get('JWT_SECRET'))
    : secrets.get('JWT_SECRET');

  return {
    PORT: Number(Bun.env.PORT || 3001),
    NODE_ENV,
    isProduction,
    JWT_SECRET: assertProductionJwt(resolvedJwt, isProduction),
    PGHOST: Bun.env.PGHOST || '127.0.0.1',
    PGPORT: Number(Bun.env.PGPORT || 5432),
    PGUSER: Bun.env.PGUSER || 'postgres',
    PGPASSWORD: secrets.get('PGPASSWORD') ?? Bun.env.PGPASSWORD ?? '',
    PGDATABASE: Bun.env.PGDATABASE || 'giftistry',
    SMTP_HOST: Bun.env.SMTP_HOST || '127.0.0.1',
    SMTP_PORT: Number(Bun.env.SMTP_PORT || 1025),
    SMTP_USER: Bun.env.SMTP_USER || '',
    SMTP_PASS: secrets.get('SMTP_PASS') ?? '',
    SMTP_SECURE: Bun.env.SMTP_SECURE === 'true',
    SMTP_FROM: Bun.env.SMTP_FROM || 'noreply@giftistry.local',
    GIFTISTRY_PUBLIC_APP_URL: Bun.env.GIFTISTRY_PUBLIC_APP_URL?.trim() || undefined,
    GIFTISTRY_ALLOW_SETUP: parseBool(Bun.env.GIFTISTRY_ALLOW_SETUP, true),
    GIFTISTRY_SETUP_TOKEN: secrets.get('GIFTISTRY_SETUP_TOKEN'),
    GIFTISTRY_CONFIG_PATH: Bun.env.GIFTISTRY_CONFIG_PATH?.trim() || undefined,
    OPENROUTER_API_KEY: secrets.get('OPENROUTER_API_KEY'),
    GEMINI_API_KEY: secrets.get('GEMINI_API_KEY'),
    OAUTH_CLIENT_SECRET: secrets.get('OAUTH_CLIENT_SECRET'),
  };
}
