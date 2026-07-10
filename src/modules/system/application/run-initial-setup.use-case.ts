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

    if (payload.dbType === 'remote') {
      if (!payload.dbUrl) {
        throw new AppError('Database connection URL is required for remote database type', 400, 'BAD_REQUEST');
      }
      try {
        const testSql = postgres(payload.dbUrl, { max: 1, connect_timeout: 5 });
        await testSql`SELECT 1`;
        await testSql.end();
      } catch (err: any) {
        throw new AppError(`Failed to connect to the remote database: ${err.message}`, 400, 'BAD_REQUEST');
      }
    }

    if (payload.smtpType === 'remote') {
      if (!payload.smtpHost || payload.smtpPort === undefined) {
        throw new AppError('SMTP host and port are required for remote SMTP type', 400, 'BAD_REQUEST');
      }
      const transportOptions: nodemailer.TransportOptions = {
        host: payload.smtpHost,
        port: payload.smtpPort,
        secure: payload.smtpSecure,
      };
      if (payload.smtpUser || payload.smtpPass) {
        transportOptions.auth = {
          user: payload.smtpUser || '',
          pass: payload.smtpPass || '',
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
      dbType: payload.dbType as 'local' | 'remote',
      dbUrl: payload.dbUrl,
      smtpType: payload.smtpType as 'local' | 'remote',
      smtpHost: payload.smtpHost,
      smtpPort: payload.smtpPort,
      smtpUser: payload.smtpUser,
      smtpPass: payload.smtpPass,
      smtpSecure: payload.smtpSecure,
      smtpFrom: payload.smtpFrom,
    });

    await this.serverConfigRepo.initializeSchema();

    const { username, email, password, firstName, lastName } = payload.admin;
    if (!username || !email || !password) {
      throw new AppError('Admin credentials (username, email, password) are required', 400, 'BAD_REQUEST');
    }

    const authHash = await Bun.password.hash(password);
    const existing = await this.serverConfigRepo.findExistingUser(username, email);
    if (existing) {
      throw new AppError('User already exists in setup phase', 400, 'BAD_REQUEST');
    }

    await this.serverConfigRepo.createAdminUser({
      username,
      email,
      firstName: firstName || 'System',
      lastName: lastName || 'Admin',
      authHash,
    });
  }
}
