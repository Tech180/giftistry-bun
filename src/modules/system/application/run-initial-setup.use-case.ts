import postgres from 'postgres';
import nodemailer from 'nodemailer';
import { AppError } from '@/common/middlewares/error.middleware';
import { env } from '@/common/consts/env.consts';
import { validatePasswordPolicy } from '@/common/domain/password-policy';
import { DEFAULT_SITE_POLICY } from '@/common/types/user-policy';
import type { SaveSitePolicyUseCase } from '@/common/application/save-site-policy.use-case';
import type { ServerConfigRepository } from '../domain/ports/server-config.repository';
import type { SetupPayload } from '../domain/server-config.entity';

/** Postgres advisory lock key for first-boot admin create. */
const SETUP_ADVISORY_LOCK = 87236401;

export class RunInitialSetupUseCase {
  constructor(
    private serverConfigRepo: ServerConfigRepository,
    private saveSitePolicy?: SaveSitePolicyUseCase
  ) {}

  async execute(payload: SetupPayload): Promise<void> {
    if (!env.GIFTISTRY_ALLOW_SETUP) {
      throw new AppError('Setup is disabled on this server', 403, 'FORBIDDEN');
    }

    const existingConfig = this.serverConfigRepo.load();
    if (existingConfig.AllowSetup === false) {
      throw new AppError('Setup has been sealed on this server', 403, 'FORBIDDEN');
    }

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

    const smtpType = (payload.SmtpType === 'remote' ? 'remote' : 'local') as 'local' | 'remote';

    if (smtpType === 'remote') {
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

    const { Username, Email, Password, FirstName, LastName } = payload.Admin;
    if (!Username || !Password) {
      throw new AppError('Admin credentials (username and password) are required', 400, 'BAD_REQUEST');
    }
    validatePasswordPolicy(Password);

    this.serverConfigRepo.save({
      ...existingConfig,
      DbType: payload.DbType as 'local' | 'remote',
      DbUrl: payload.DbUrl,
      SmtpType: smtpType,
      SmtpHost: smtpType === 'remote' ? payload.SmtpHost : undefined,
      SmtpPort: smtpType === 'remote' ? payload.SmtpPort : undefined,
      SmtpUser: smtpType === 'remote' ? payload.SmtpUser : undefined,
      SmtpPass: smtpType === 'remote' ? payload.SmtpPass : undefined,
      SmtpSecure: smtpType === 'remote' ? payload.SmtpSecure : undefined,
      SmtpFrom: smtpType === 'remote' ? payload.SmtpFrom : undefined,
      AllowSetup: true,
    });

    await this.serverConfigRepo.initializeSchema();

    const email = Email?.trim() ? Email.trim() : null;
    const authHash = await Bun.password.hash(Password);

    try {
      await this.serverConfigRepo.createAdminUserWithLock({
        username: Username,
        email,
        firstName: FirstName || 'System',
        lastName: LastName || 'Admin',
        authHash,
        lockKey: SETUP_ADVISORY_LOCK,
      });
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      const message = String(err?.message || err);
      if (message.includes('unique') || message.includes('duplicate') || err?.code === '23505') {
        throw new AppError('Forbidden: System already setup', 400, 'BAD_REQUEST');
      }
      throw err;
    }

    if (this.saveSitePolicy) {
      await this.saveSitePolicy.execute({
        ...DEFAULT_SITE_POLICY,
        RegistrationMode: 'invite_only',
      });
    }

    // Seal setup after successful admin creation
    const sealed = this.serverConfigRepo.load();
    this.serverConfigRepo.save({
      ...sealed,
      AllowSetup: false,
    });
  }
}
