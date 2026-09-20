import type { SecretSource } from '@/common/domain/ports/secret-source.port';
import { getSecretSource } from '@/common/infrastructure/secrets';

const WEAK_JWT_DEFAULTS = new Set([
  'local_secret_key_for_giftistry',
  'changeme',
  'secret',
  'jwt_secret',
]);

export interface RuntimeConfig {
  PORT: number;
  NODE_ENV: string;
  isProduction: boolean;
  JWT_SECRET: string;
  PGHOST: string;
  PGPORT: number;
  PGUSER: string;
  PGPASSWORD: string;
  PGDATABASE: string;
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_USER: string;
  SMTP_PASS: string;
  SMTP_SECURE: boolean;
  SMTP_FROM: string;
  /** Non-secret env override for public app URL (config also has PublicAppUrl). */
  GIFTISTRY_PUBLIC_APP_URL: string | undefined;
  /** When false, setup is refused even if no users exist. Default true. */
  GIFTISTRY_ALLOW_SETUP: boolean;
  /** Optional install token; when set, POST /setup requires matching header/body. */
  GIFTISTRY_SETUP_TOKEN: string | undefined;
  GIFTISTRY_CONFIG_PATH: string | undefined;
  OPENROUTER_API_KEY: string | undefined;
  GEMINI_API_KEY: string | undefined;
  OAUTH_CLIENT_SECRET: string | undefined;
}

function parseBool(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value === '') return defaultValue;
  const v = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(v)) return true;
  if (['0', 'false', 'no', 'off'].includes(v)) return false;
  return defaultValue;
}

function assertProductionJwt(secret: string | undefined, isProduction: boolean): string {
  const trimmed = secret?.trim() ?? '';
  if (!isProduction) {
    return trimmed || 'local_secret_key_for_giftistry';
  }
  if (!trimmed) {
    throw new Error(
      '[boot] JWT_SECRET is required in production. Set JWT_SECRET, JWT_SECRET_FILE, or a credentials-dir file named JWT_SECRET.'
    );
  }
  if (WEAK_JWT_DEFAULTS.has(trimmed) || trimmed.length < 32) {
    throw new Error(
      '[boot] JWT_SECRET in production must be at least 32 characters and must not be a known default. Generate a strong secret.'
    );
  }
  return trimmed;
}

/** Build typed runtime config from SecretSource + non-secret Bun.env. Call once at boot. */
export function loadRuntimeConfig(secrets: SecretSource = getSecretSource()): RuntimeConfig {
  const NODE_ENV = Bun.env.NODE_ENV || 'development';
  const isProduction = NODE_ENV === 'production';

  return {
    PORT: Number(Bun.env.PORT || 3001),
    NODE_ENV,
    isProduction,
    JWT_SECRET: assertProductionJwt(secrets.get('JWT_SECRET'), isProduction),
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

let cachedEnv: RuntimeConfig | null = null;

/** Lazy singleton used by the rest of the app (boot validates JWT on first access). */
export function getEnv(): RuntimeConfig {
  if (!cachedEnv) {
    cachedEnv = loadRuntimeConfig();
  }
  return cachedEnv;
}

/** Test helper. */
export function setEnvForTests(config: RuntimeConfig | null): void {
  cachedEnv = config;
}

/** @deprecated Prefer getEnv(); kept as a Proxy for existing `env.X` imports. */
export const env: RuntimeConfig = new Proxy({} as RuntimeConfig, {
  get(_target, prop: string | symbol) {
    const runtime = getEnv();
    if (typeof prop === 'string' && prop in runtime) {
      return runtime[prop as keyof RuntimeConfig];
    }
    return undefined;
  },
});
