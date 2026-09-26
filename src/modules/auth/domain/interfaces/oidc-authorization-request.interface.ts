export interface OidcAuthorizationRequest {
  authorizationUrl: string;
  state: string;
  nonce: string;
}
