import postgres from 'postgres';
import nodemailer from 'nodemailer';
import { AppError } from '@/common/middlewares/error.middleware';
import type { ServerConfigRepository } from '../domain/ports/server-config.repository';
import type { SetupPayload } from '../domain/server-config.entity';

export class RunInitialSetupUseCase {
  constructor(private serverConfigRepo: ServerConfigRepository) {}

  async execute(payload: SetupPayload): Promise<void> {
    const initialized = await this.serverConfigRepo.isSystemInitialized();
    if (initialized) {
      throw new AppError('Forbidden: System already setup', 400, 'BAD_REQUEST');
    }

    if (payload.DbType === 'remote') {
      if (!payload.DbUrl) {
        throw new AppError('Database connection URL is required for remote database type', 400, 'BAD_REQUEST');
      }
      try {
        const testSql = postgres(payload.DbUrl, { max: 1, connect_timeout: 5 });
        await testSql`SELECT 1`;
        await testSql.end();
      } catch (err: any) {
        throw new AppError(`Failed to connect to the remote database: ${err.message}`, 400, 'BAD_REQUEST');
      }
    }

    if (payload.SmtpType === 'remote') {
      if (!payload.SmtpHost || payload.SmtpPort === undefined) {
        throw new AppError('SMTP host and port are required for remote SMTP type', 400, 'BAD_REQUEST');
      }
      const transportOptions: nodemailer.TransportOptions = {
        host: payload.SmtpHost,
        port: payload.SmtpPort,
        secure: payload.SmtpSecure,
      };
      if (payload.SmtpUser || payload.SmtpPass) {
        transportOptions.auth = {
          user: payload.SmtpUser || '',
          pass: payload.SmtpPass || '',
        };
      }
      try {
        const testTransporter = nodemailer.createTransport(transportOptions);
        await testTransporter.verify();
      } catch (err: any) {
        throw new AppError(`Failed to verify SMTP connection: ${err.message}`, 400, 'BAD_REQUEST');
      }
    }

    this.serverConfigRepo.save({
      DbType: payload.DbType as 'local' | 'remote',
      DbUrl: payload.DbUrl,
      SmtpType: payload.SmtpType as 'local' | 'remote',
      SmtpHost: payload.SmtpHost,
      SmtpPort: payload.SmtpPort,
      SmtpUser: payload.SmtpUser,
      SmtpPass: payload.SmtpPass,
      SmtpSecure: payload.SmtpSecure,
      SmtpFrom: payload.SmtpFrom,
    });

    await this.serverConfigRepo.initializeSchema();

    const { Username, Email, Password, FirstName, LastName } = payload.Admin;
    if (!Username || !Email || !Password) {
      throw new AppError('Admin credentials (username, email, password) are required', 400, 'BAD_REQUEST');
    }

    const authHash = await Bun.password.hash(Password);
    const existing = await this.serverConfigRepo.findExistingUser(Username, Email);
    if (existing) {
      throw new AppError('User already exists in setup phase', 400, 'BAD_REQUEST');
    }

    await this.serverConfigRepo.createAdminUser({
      username: Username,
      email: Email,
      firstName: FirstName || 'System',
      lastName: LastName || 'Admin',
      authHash,
    });
  }
}
