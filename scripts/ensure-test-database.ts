import postgres from 'postgres';
import { initializeSchema, runMigrations } from '../src/common/database';

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

// Keep the suite idempotent: setup tests seal registration to invite_only.
const [policyRow] = await testSql<{ policy: unknown }[]>`
  SELECT policy FROM site_policy WHERE id = 1
`;
const currentPolicy =
  policyRow?.policy &&
  typeof policyRow.policy === 'object' &&
  !Array.isArray(policyRow.policy)
    ? (policyRow.policy as Record<string, unknown>)
    : {};
const nextPolicy = { ...currentPolicy, RegistrationMode: 'open' };
await testSql`
  INSERT INTO site_policy (id, policy)
  VALUES (1, ${testSql.json(nextPolicy)})
  ON CONFLICT (id) DO UPDATE
  SET policy = ${testSql.json(nextPolicy)}
`;

await testSql.end();

console.log(`[INFO] Test database "${testDatabase}" is ready.`);
