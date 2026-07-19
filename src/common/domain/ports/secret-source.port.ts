export const SECRET_NAMES = [
  'JWT_SECRET',
  'GIFTISTRY_SETUP_TOKEN',
  'SMTP_PASS',
  'OPENROUTER_API_KEY',
  'GEMINI_API_KEY',
  'OAUTH_CLIENT_SECRET',
  'PGPASSWORD',
] as const;

export type SecretName = (typeof SECRET_NAMES)[number];

export interface SecretSource {
  /** Returns trimmed secret or undefined if unset. */
  get(name: SecretName): string | undefined;
}
