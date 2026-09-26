import postgres from 'postgres';
import { AppError } from '@/common/domain/errors/app-error';
import { DOMAIN_ERROR_STATUS } from '@/common/domain/errors/constants/domain-error-status.constant';

export async function verifyRemoteDatabaseUrl(dbUrl: string): Promise<void> {
  if (!dbUrl) {
    throw new AppError(
      'Database connection URL is required for remote database type',
      DOMAIN_ERROR_STATUS.BAD_REQUEST,
      'BAD_REQUEST'
    );
  }
  try {
    const testSql = postgres(dbUrl, { max: 1, connect_timeout: 5 });
    await testSql`SELECT 1`;
    await testSql.end();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new AppError(
      `Failed to connect to the remote database: ${message}`,
      DOMAIN_ERROR_STATUS.BAD_REQUEST,
      'BAD_REQUEST'
    );
  }
}
