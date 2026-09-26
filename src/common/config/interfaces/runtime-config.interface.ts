export interface RuntimeConfig {
  PORT: number;
  NODE_ENV: string;
  isProduction: boolean;
  JWT_SECRET: string;
  PGHOST: string;
  PGPORT: number;
  PGUSER: string;
  PGPASSWORD: string;
  PGDATABASE: string;
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_USER: string;
  SMTP_PASS: string;
  SMTP_SECURE: boolean;
  SMTP_FROM: string;
  /** Bootstrap public app URL when config.PublicAppUrl is unset (config wins once saved). */
  GIFTISTRY_PUBLIC_APP_URL: string | undefined;
  /** When false, setup is refused even if no users exist. Default true. */
  GIFTISTRY_ALLOW_SETUP: boolean;
  /** Optional install token; when set, POST /setup requires matching header/body. */
  GIFTISTRY_SETUP_TOKEN: string | undefined;
  GIFTISTRY_CONFIG_PATH: string | undefined;
  OPENROUTER_API_KEY: string | undefined;
  GEMINI_API_KEY: string | undefined;
  OAUTH_CLIENT_SECRET: string | undefined;
}
