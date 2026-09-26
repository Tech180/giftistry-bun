import { loadConfig } from '@/common/config/utils/server-config-file.util';
import { ACTIVE_SQL } from '../constants/active-sql.constant';
import { createSqlClient } from './create-sql-client.util';
import { requireActiveSql } from './sql-proxy.util';

export function reinitializeDbConnection(): void {
  const config = loadConfig();
  const oldSql = requireActiveSql();
  ACTIVE_SQL.current = createSqlClient(config);
  try {
    oldSql.end();
  } catch (err) {
    console.error('Error closing old DB pool:', err);
  }
}
