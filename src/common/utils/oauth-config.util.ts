import { env } from '@/common/consts/env.consts';
import type { ServerConfig } from '@/modules/system/domain/server-config.entity';

export function resolveOAuthClientSecret(config: ServerConfig): string {
  return env.OAUTH_CLIENT_SECRET?.trim() || config.OAuthClientSecret?.trim() || '';
}

export function getApiBaseUrl(): string {
  const fromEnv = Bun.env.GIFTISTRY_API_URL?.trim().replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  return `http://localhost:${env.PORT}`;
}

export function getOAuthRedirectUri(): string {
  return `${getApiBaseUrl()}/api/auth/oauth/callback`;
}
