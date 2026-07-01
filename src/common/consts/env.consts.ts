export const env = {
  PORT: Number(Bun.env.PORT || 3001),
  NODE_ENV: Bun.env.NODE_ENV || 'development',
  JWT_SECRET: Bun.env.JWT_SECRET || 'local_secret_key_for_giftistry',
  
  // Postgres configuration (will read from Nix shell exports automatically)
  PGHOST: Bun.env.PGHOST || '127.0.0.1',
  PGPORT: Number(Bun.env.PGPORT || 5432),
  PGUSER: Bun.env.PGUSER || 'postgres',
  PGPASSWORD: Bun.env.PGPASSWORD || '',
  PGDATABASE: Bun.env.PGDATABASE || 'giftistry',
  N8N: Bun.env.N8N || '',
  SMTP_HOST: Bun.env.SMTP_HOST || '127.0.0.1',
  SMTP_PORT: Number(Bun.env.SMTP_PORT || 1025),
  SMTP_USER: Bun.env.SMTP_USER || '',
  SMTP_PASS: Bun.env.SMTP_PASS || '',
  SMTP_SECURE: Bun.env.SMTP_SECURE === 'true',
  SMTP_FROM: Bun.env.SMTP_FROM || 'noreply@giftistry.local',
};
