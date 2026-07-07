import postgres from 'postgres';
import { initializeSchema } from '../src/common/database/init-schema';
import { runMigrations } from '../src/common/database/migrations';

const testDatabase = process.env.PGDATABASE || 'giftistry_test';

const baseConfig = {
  host: process.env.PGHOST || '127.0.0.1',
  port: Number(process.env.PGPORT || 5432),
  username: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || '',
};

const admin = postgres({ ...baseConfig, database: 'postgres' });

try {
  await admin.unsafe(`CREATE DATABASE ${testDatabase}`);
  console.log(`[INFO] Created test database "${testDatabase}".`);
} catch (err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  if (!message.includes('already exists')) {
    throw err;
  }
} finally {
  await admin.end();
}

const testSql = postgres({ ...baseConfig, database: testDatabase });

const [row] = await testSql<{ exists: boolean }[]>`
  SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_name = 'users'
  ) as exists
`;

if (!row?.exists) {
  console.log(`[INFO] Initializing schema for "${testDatabase}"...`);
  await initializeSchema(testSql);
}

await runMigrations(testSql);
await testSql.end();

console.log(`[INFO] Test database "${testDatabase}" is ready.`);
