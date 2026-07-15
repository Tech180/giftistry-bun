import postgres from 'postgres';
import nodemailer from 'nodemailer';
import { AppError } from '@/common/middlewares/error.middleware';
import type { ServerConfigRepository } from '../domain/ports/server-config.repository';
import {
  clampAiCompletionTimeoutMs,
  clampScrapeFetchTimeoutMs,
  clampScrapePlaywrightTimeoutMs,
  normalizeAiProvider,
  resolveMaskedSecret,
  type SystemSettingsPayload,
} from '../domain/server-config.entity';
import type { TestAiConnectionUseCase } from './test-ai-connection.use-case';

export class SaveSystemSettingsUseCase {
  constructor(
    private serverConfigRepo: ServerConfigRepository,
    private testAiConnection: TestAiConnectionUseCase
  ) {}

  async execute(settings: SystemSettingsPayload): Promise<void> {
    if (settings.DbType === 'remote') {
      if (!settings.DbUrl) {
        throw new AppError('Database connection URL is required for remote database type', 400, 'BAD_REQUEST');
      }
      try {
        const testSql = postgres(settings.DbUrl, { max: 1, connect_timeout: 5 });
        await testSql`SELECT 1`;
        await testSql.end();
      } catch (err: any) {
        throw new AppError(`Failed to connect to the remote database: ${err.message}`, 400, 'BAD_REQUEST');
      }
    }

    const config = this.serverConfigRepo.load();
    const smtpPass = resolveMaskedSecret(settings.SmtpPass, config.SmtpPass);

    if (settings.SmtpType === 'remote') {
      if (!settings.SmtpHost || settings.SmtpPort === undefined) {
        throw new AppError('SMTP host and port are required for remote SMTP type', 400, 'BAD_REQUEST');
      }

      const transportOptions: nodemailer.TransportOptions = {
        host: settings.SmtpHost,
        port: settings.SmtpPort,
        secure: settings.SmtpSecure,
      };
      if (settings.SmtpUser || smtpPass) {
        transportOptions.auth = {
          user: settings.SmtpUser,
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

    const fastProvider = normalizeAiProvider(settings.AiFastProvider ?? config.AiFastProvider);
    const intelligentProvider = normalizeAiProvider(
      settings.AiIntelligentProvider ?? config.AiIntelligentProvider
    );
    const fastEndpoint = (settings.AiFastEndpoint ?? config.AiFastEndpoint ?? '').trim();
    const intelligentEndpoint = (
      settings.AiIntelligentEndpoint ??
      config.AiIntelligentEndpoint ??
      ''
    ).trim();
    const fastApiKey = resolveMaskedSecret(settings.AiFastApiKey, config.AiFastApiKey);
    const intelligentApiKey = resolveMaskedSecret(
      settings.AiIntelligentApiKey,
      config.AiIntelligentApiKey
    );

    if (settings.AiEnabled) {
      if (fastProvider === 'local') {
        if (!fastEndpoint) {
          throw new AppError(
            'API endpoint URL is required for Fast local AI provider',
            400,
            'BAD_REQUEST'
          );
        }
        await this.testAiConnection.execute({
          AiProvider: 'local',
          AiEndpoint: fastEndpoint,
          AiApiKey: fastApiKey,
          AiModel: settings.AiFastModel,
        });
      }
      if (intelligentProvider === 'local') {
        if (!intelligentEndpoint) {
          throw new AppError(
            'API endpoint URL is required for Intelligent local AI provider',
            400,
            'BAD_REQUEST'
          );
        }
        await this.testAiConnection.execute({
          AiProvider: 'local',
          AiEndpoint: intelligentEndpoint,
          AiApiKey: intelligentApiKey,
          AiModel: settings.AiIntelligentModel,
        });
      }
    }

    this.serverConfigRepo.save({
      DbType: settings.DbType as 'local' | 'remote',
      DbUrl: settings.DbUrl,
      SmtpType: settings.SmtpType as 'local' | 'remote',
      SmtpHost: settings.SmtpHost,
      SmtpPort: settings.SmtpPort,
      SmtpUser: settings.SmtpUser,
      SmtpPass: smtpPass,
      SmtpSecure: settings.SmtpSecure,
      SmtpFrom: settings.SmtpFrom,
      AiEnabled: settings.AiEnabled,
      AiWebSearchEnabled: settings.AiWebSearchEnabled,
      AiRateLimitEnabled: settings.AiRateLimitEnabled !== false,
      AiFastProvider: fastProvider,
      AiFastEndpoint: fastEndpoint,
      AiFastApiKey: fastApiKey,
      AiFastModel: settings.AiFastModel,
      AiIntelligentProvider: intelligentProvider,
      AiIntelligentEndpoint: intelligentEndpoint,
      AiIntelligentApiKey: intelligentApiKey,
      AiIntelligentModel: settings.AiIntelligentModel,
      AiPrompt: settings.AiPrompt,
      AiDescriptionPrompt: settings.AiDescriptionPrompt,
      AiPopulatePrompt: settings.AiPopulatePrompt,
      AiCategoryPrompt: settings.AiCategoryPrompt,
      AiImportPrompt: settings.AiImportPrompt,
      AiCompletionTimeoutMs: clampAiCompletionTimeoutMs(
        settings.AiCompletionTimeoutMs ?? config.AiCompletionTimeoutMs
      ),
      ScrapeFetchTimeoutMs: clampScrapeFetchTimeoutMs(
        settings.ScrapeFetchTimeoutMs ?? config.ScrapeFetchTimeoutMs
      ),
      ScrapePlaywrightTimeoutMs: clampScrapePlaywrightTimeoutMs(
        settings.ScrapePlaywrightTimeoutMs ?? config.ScrapePlaywrightTimeoutMs
      ),
    });
  }
}
