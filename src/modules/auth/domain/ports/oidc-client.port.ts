export interface OidcUserInfo {
  sub: string;
  email?: string | null;
  givenName?: string | null;
  familyName?: string | null;
  preferredUsername?: string | null;
}

export interface OidcAuthorizationRequest {
  authorizationUrl: string;
  state: string;
  nonce: string;
}

export interface OidcClientPort {
  buildAuthorizationRequest(scopes: string): Promise<OidcAuthorizationRequest>;
  exchangeCode(code: string, state: string, expectedState: string, nonce: string): Promise<OidcUserInfo>;
}
