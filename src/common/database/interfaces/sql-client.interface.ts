import type postgres from 'postgres';

export type SqlClient = ReturnType<typeof postgres>;
