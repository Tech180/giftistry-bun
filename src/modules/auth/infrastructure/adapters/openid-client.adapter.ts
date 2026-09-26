import * as client from 'openid-client';
import { AppError } from '@/common/domain/errors/app-error';
import type { ServerConfigRepository } from '@/modules/system';
import { getOAuthRedirectUri } from '@/common/utils/oauth-config.util';
import type { OidcAuthorizationRequest } from '../../domain/interfaces/oidc-authorization-request.interface';
import type { OidcUserInfo } from '../../domain/interfaces/oidc-user-info.interface';
import type { OidcClientPort } from '../../domain/ports/oidc-client.port';
import { consumeOAuthState as consumeStoredOAuthState, saveOAuthState } from '../stores/oauth-state.store';
import { getOidcConfiguration } from '../utils/get-oidc-configuration.util';

export class OpenIdClientAdapter implements OidcClientPort {
  constructor(private serverConfigRepo: ServerConfigRepository) {}

  async buildAuthorizationRequest(
    scopes: string,
    inviteToken?: string | null
  ): Promise<OidcAuthorizationRequest> {
    const configuration = await getOidcConfiguration(this.serverConfigRepo);
    const state = crypto.randomUUID();
    const nonce = crypto.randomUUID();
    saveOAuthState(state, nonce, inviteToken);

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

    const configuration = await getOidcConfiguration(this.serverConfigRepo);
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

  consumeOAuthState(state: string): { nonce: string; inviteToken: string | null } | null {
    return consumeStoredOAuthState(state);
  }
}
