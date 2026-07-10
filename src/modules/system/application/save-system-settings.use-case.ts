import postgres from 'postgres';
import nodemailer from 'nodemailer';
import { AppError } from '@/common/middlewares/error.middleware';
import type { ServerConfigRepository } from '../domain/ports/server-config.repository';
import { resolveMaskedSecret, type SystemSettingsPayload } from '../domain/server-config.entity';

export class SaveSystemSettingsUseCase {
  constructor(private serverConfigRepo: ServerConfigRepository) {}

  async execute(settings: SystemSettingsPayload): Promise<void> {
    if (settings.dbType === 'remote') {
      if (!settings.dbUrl) {
        throw new AppError('Database connection URL is required for remote database type', 400, 'BAD_REQUEST');
      }
      try {
        const testSql = postgres(settings.dbUrl, { max: 1, connect_timeout: 5 });
        await testSql`SELECT 1`;
        await testSql.end();
      } catch (err: any) {
        throw new AppError(`Failed to connect to the remote database: ${err.message}`, 400, 'BAD_REQUEST');
      }
    }

    const config = this.serverConfigRepo.load();
    const smtpPass = resolveMaskedSecret(settings.smtpPass, config.smtpPass);

    if (settings.smtpType === 'remote') {
      if (!settings.smtpHost || settings.smtpPort === undefined) {
        throw new AppError('SMTP host and port are required for remote SMTP type', 400, 'BAD_REQUEST');
      }

      const transportOptions: nodemailer.TransportOptions = {
        host: settings.smtpHost,
        port: settings.smtpPort,
        secure: settings.smtpSecure,
      };
      if (settings.smtpUser || smtpPass) {
        transportOptions.auth = {
          user: settings.smtpUser,
          pass: smtpPass,
        };
      }

      try {
        const testTransporter = nodemailer.createTransport(transportOptions);
        await testTransporter.verify();
      } catch (err: any) {
        throw new AppError(`Failed to verify SMTP connection: ${err.message}`, 400, 'BAD_REQUEST');
      }
    }

    const aiApiKey = resolveMaskedSecret(settings.aiApiKey, config.aiApiKey);

    this.serverConfigRepo.save({
      dbType: settings.dbType as 'local' | 'remote',
      dbUrl: settings.dbUrl,
      smtpType: settings.smtpType as 'local' | 'remote',
      smtpHost: settings.smtpHost,
      smtpPort: settings.smtpPort,
      smtpUser: settings.smtpUser,
      smtpPass,
      smtpSecure: settings.smtpSecure,
      smtpFrom: settings.smtpFrom,
      aiEnabled: settings.aiEnabled,
      aiProvider: settings.aiProvider as any,
      aiApiKey,
      aiModel: settings.aiModel,
      aiPrompt: settings.aiPrompt,
      aiEndpoint: settings.aiEndpoint,
    });
  }
}
