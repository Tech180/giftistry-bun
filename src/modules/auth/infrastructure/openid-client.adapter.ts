import * as client from 'openid-client';
import { AppError } from '@/common/middlewares/error.middleware';
import type { ServerConfigRepository } from '@/modules/system/domain/ports/server-config.repository';
import { getOAuthRedirectUri, resolveOAuthClientSecret } from '@/common/utils/oauth-config.util';
import type { OidcClientPort, OidcAuthorizationRequest, OidcUserInfo } from '../domain/ports/oidc-client.port';
import { saveOAuthState } from './oauth-state.store';

let cachedIssuer: client.Configuration | null = null;
let cachedIssuerUrl = '';

async function getConfiguration(serverConfigRepo: ServerConfigRepository): Promise<client.Configuration> {
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

  if (cachedIssuer && cachedIssuerUrl === issuerUrl) {
    return cachedIssuer;
  }

  const issuer = await client.discovery(new URL(issuerUrl), clientId, clientSecret);
  cachedIssuer = issuer;
  cachedIssuerUrl = issuerUrl;
  return issuer;
}

export class OpenIdClientAdapter implements OidcClientPort {
  constructor(private serverConfigRepo: ServerConfigRepository) {}

  async buildAuthorizationRequest(scopes: string): Promise<OidcAuthorizationRequest> {
    const configuration = await getConfiguration(this.serverConfigRepo);
    const state = crypto.randomUUID();
    const nonce = crypto.randomUUID();
    saveOAuthState(state, nonce);

    const authorizationUrl = client.buildAuthorizationUrl(configuration, {
      redirect_uri: getOAuthRedirectUri(),
      scope: scopes.trim() || 'openid email profile',
      state,
      nonce,
    });

    return {
      authorizationUrl: authorizationUrl.href,
      state,
      nonce,
    };
  }

  async exchangeCode(
    code: string,
    state: string,
    expectedState: string,
    nonce: string
  ): Promise<OidcUserInfo> {
    if (!state || state !== expectedState) {
      throw new AppError('Invalid OAuth state', 400, 'BAD_REQUEST');
    }

    const configuration = await getConfiguration(this.serverConfigRepo);
    const currentUrl = new URL(getOAuthRedirectUri());
    currentUrl.searchParams.set('code', code);
    currentUrl.searchParams.set('state', state);

    const tokens = await client.authorizationCodeGrant(configuration, currentUrl, {
      expectedState,
      expectedNonce: nonce,
    });

    const claims = tokens.claims();
    if (!claims?.sub) {
      throw new AppError('OAuth provider did not return a subject identifier', 502, 'BAD_GATEWAY');
    }

    return {
      sub: String(claims.sub),
      email: typeof claims.email === 'string' ? claims.email : null,
      givenName: typeof claims.given_name === 'string' ? claims.given_name : null,
      familyName: typeof claims.family_name === 'string' ? claims.family_name : null,
      preferredUsername:
        typeof claims.preferred_username === 'string' ? claims.preferred_username : null,
    };
  }
}
