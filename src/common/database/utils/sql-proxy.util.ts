import { ACTIVE_SQL } from '../constants/active-sql.constant';
import type { SqlClient } from '../interfaces/sql-client.interface';

export function requireActiveSql(): SqlClient {
  if (!ACTIVE_SQL.current) {
    throw new Error('[database] SQL pool is not initialized');
  }
  return ACTIVE_SQL.current;
}

/** Proxy that redirects all calls/properties to ACTIVE_SQL.current. */
export const sql = new Proxy(() => {}, {
  get(_target, prop) {
    if (prop === 'then') {
      // Avoid resolving the proxy function as a Promise
      return undefined;
    }
    const client = requireActiveSql();
    const val = Reflect.get(client, prop);
    if (typeof val === 'function') {
      return val.bind(client);
    }
    return val;
  },
  apply(_target, _thisArg, argumentsList) {
    const client = requireActiveSql();
    return Reflect.apply(client as unknown as (...args: unknown[]) => unknown, client, argumentsList);
  },
}) as unknown as SqlClient;
