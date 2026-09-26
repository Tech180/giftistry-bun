export interface OAuthStateEntry {
  nonce: string;
  inviteToken: string | null;
  expiresAt: number;
}
