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
};
