import { loadConfig } from '@/common/config/utils/server-config-file.util';
import { ACTIVE_SQL } from './constants/active-sql.constant';
import { createSqlClient } from './utils/create-sql-client.util';

ACTIVE_SQL.current = createSqlClient(loadConfig());

export { loadConfig } from '@/common/config/utils/server-config-file.util';
export { saveConfig } from './utils/save-config.util';
export { sql } from './utils/sql-proxy.util';
export { reinitializeDbConnection } from './utils/reinitialize-db-connection.util';
export { pingDatabase } from './utils/ping-database.util';
export { closeDatabasePool } from './utils/close-database-pool.util';
export { initializeSchema } from './schema/initialize-schema';
export { runMigrations } from './migrations/run-migrations';
export type { SqlClient } from './interfaces/sql-client.interface';
