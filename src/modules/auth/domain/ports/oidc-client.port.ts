import type { OidcAuthorizationRequest } from '../interfaces/oidc-authorization-request.interface';
import type { OidcUserInfo } from '../interfaces/oidc-user-info.interface';

export interface OidcClientPort {
  buildAuthorizationRequest(
    scopes: string,
    inviteToken?: string | null
  ): Promise<OidcAuthorizationRequest>;
  exchangeCode(code: string, state: string, expectedState: string, nonce: string): Promise<OidcUserInfo>;
  consumeOAuthState(state: string): { nonce: string; inviteToken: string | null } | null;
}
