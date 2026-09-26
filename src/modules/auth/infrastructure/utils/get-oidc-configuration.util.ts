import * as client from 'openid-client';
import { AppError } from '@/common/domain/errors/app-error';
import type { ServerConfigRepository } from '@/modules/system';
import { resolveOAuthClientSecret } from '@/common/utils/oauth-config.util';
import { OIDC_CONFIGURATION_CACHE } from '../constants/oidc-configuration-cache.constant';

export async function getOidcConfiguration(
  serverConfigRepo: ServerConfigRepository
): Promise<client.Configuration> {
  const config = serverConfigRepo.load();
  if (!config.OAuthEnabled) {
    throw new AppError('OAuth login is not enabled on this server', 403, 'FORBIDDEN');
  }

  const issuerUrl = config.OAuthIssuerUrl?.trim();
  const clientId = config.OAuthClientId?.trim();
  const clientSecret = resolveOAuthClientSecret(config);

  if (!issuerUrl || !clientId || !clientSecret) {
    throw new AppError('OAuth is not fully configured on this server', 503, 'SERVICE_UNAVAILABLE');
  }

  if (OIDC_CONFIGURATION_CACHE.configuration && OIDC_CONFIGURATION_CACHE.issuerUrl === issuerUrl) {
    return OIDC_CONFIGURATION_CACHE.configuration;
  }

  const issuer = await client.discovery(new URL(issuerUrl), clientId, clientSecret);
  OIDC_CONFIGURATION_CACHE.configuration = issuer;
  OIDC_CONFIGURATION_CACHE.issuerUrl = issuerUrl;
  return issuer;
}
