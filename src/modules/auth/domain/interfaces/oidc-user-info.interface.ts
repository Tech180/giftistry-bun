export interface OidcUserInfo {
  sub: string;
  email?: string | null;
  givenName?: string | null;
  familyName?: string | null;
  preferredUsername?: string | null;
}
