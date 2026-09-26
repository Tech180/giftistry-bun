import postgres from 'postgres';
import { getEnv } from '../src/common/config/utils/get-env.util';

const args = process.argv.slice(2);
const runtime = getEnv();

if (!args.includes('--confirm')) {
  console.error(`This will delete ALL user data in database "${runtime.PGDATABASE}".`);
  console.error('Run: bun run reset-database -- --confirm');
  process.exit(1);
}

if (runtime.PGDATABASE === 'giftistry_test') {
  console.error(
    'Refusing to reset the test database. Use PGDATABASE=giftistry bun run reset-database -- --confirm'
  );
  process.exit(1);
}

const config = postgres({
  host: runtime.PGHOST,
  port: runtime.PGPORT,
  username: runtime.PGUSER,
  password: runtime.PGPASSWORD,
  database: runtime.PGDATABASE,
});

console.log(`[INFO] Resetting database "${runtime.PGDATABASE}"...`);

await config`DELETE FROM user_passkeys`;
await config`DELETE FROM users`;

await config.end();

console.log('[INFO] Database reset complete. Restart the API and complete setup if needed.');
