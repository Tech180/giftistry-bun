import postgres from 'postgres';
import { env } from '../src/common/consts/env.consts';

const args = process.argv.slice(2);

if (!args.includes('--confirm')) {
  console.error(`This will delete ALL user data in database "${env.PGDATABASE}".`);
  console.error('Run: bun run reset-database -- --confirm');
  process.exit(1);
}

if (env.PGDATABASE === 'giftistry_test') {
  console.error(
    'Refusing to reset the test database. Use PGDATABASE=giftistry bun run reset-database -- --confirm'
  );
  process.exit(1);
}

const config = postgres({
  host: env.PGHOST,
  port: env.PGPORT,
  username: env.PGUSER,
  password: env.PGPASSWORD,
  database: env.PGDATABASE,
});

console.log(`[INFO] Resetting database "${env.PGDATABASE}"...`);

await config`DELETE FROM user_passkeys`;
await config`DELETE FROM users`;

await config.end();

console.log('[INFO] Database reset complete. Restart the API and complete setup if needed.');
