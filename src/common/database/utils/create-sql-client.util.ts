import postgres from 'postgres';
import { getEnv } from '@/common/config/utils/get-env.util';
import type { ServerConfig } from '@/modules/system';
import type { SqlClient } from '../interfaces/sql-client.interface';

export function createSqlClient(config: ServerConfig): SqlClient {
  if (config.DbType === 'remote' && config.DbUrl) {
    return postgres(config.DbUrl, {
      max: 10,
      idle_timeout: 5,
    });
  }

  const runtime = getEnv();
  return postgres({
    host: runtime.PGHOST,
    port: runtime.PGPORT,
    username: runtime.PGUSER,
    password: runtime.PGPASSWORD,
    database: runtime.PGDATABASE,
    max: 10,
    idle_timeout: 5,
  });
}
