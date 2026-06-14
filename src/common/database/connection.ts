import postgres from 'postgres';
import { env } from '../consts/env.consts';

// If PGHOST starts with a slash, it's a Unix socket directory path.
// Otherwise, it's a TCP host.
const isUnixSocket = env.PGHOST.startsWith('/');

export const sql = postgres({
  host: env.PGHOST,
  port: env.PGPORT,
  username: env.PGUSER,
  password: env.PGPASSWORD,
  database: env.PGDATABASE,
  // If we are connecting via Unix socket, we can specify the path as the host
  // and pass the options.
});
