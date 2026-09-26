import type { SqlClient } from '../interfaces/sql-client.interface';

/** Process-wide active SQL pool (swapped on config reload). */
export const ACTIVE_SQL: { current: SqlClient | null } = {
  current: null,
};
