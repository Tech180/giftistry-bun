import { AppError } from '@/common/domain/errors/app-error';
import { DOMAIN_ERROR_STATUS } from '@/common/domain/errors/constants/domain-error-status.constant';
import type { ServerConfigRepository } from '../../../domain/ports/server-config.repository';
import type { SystemSettingsPayload } from '../../../domain/interfaces/system-settings-payload.interface';
import {
  clampAiCompletionTimeoutMs,
  clampAiConnectTimeoutMs,
  clampAiImportChunkItemLimit,
  clampGrabInfoActiveStreamLimit,
  clampGrabInfoConcurrency,
  clampScrapeFetchTimeoutMs,
  clampScrapePlaywrightTimeoutMs,
} from '../../../domain/utils/clamp-server-config-limits.util';
import { normalizeAiProvider } from '../../../domain/utils/normalize-ai-provider.util';
import { normalizeGrabInfoConcurrencyUnlimited } from '../../../domain/utils/normalize-grab-info-concurrency-unlimited.util';
import { resolveMaskedSecret } from '../../../domain/utils/resolve-masked-secret.util';
import {
  mergeMetadataPackCatalog,
  METADATA_PACKS_CATALOG,
  sanitizeCustomPacks,
  sanitizeEnabledPackIds,
  toCustomPackSettingsDto,
} from '../../../domain/packs';
import { resolveOAuthClientSecret } from '@/common/utils/oauth-config.util';
import type { TestAiConnectionUseCase } from '../../ai/use-cases/test-ai-connection.use-case';
import type { SaveSystemSettingsOptions } from '../interfaces/save-system-settings-options.type';
import { verifyRemoteDatabaseUrl } from '../utils/verify-remote-database-url.util';
import { verifyRemoteSmtpTransport } from '../utils/verify-remote-smtp-transport.util';

export class SaveSystemSettingsUseCase {
  constructor(
    private serverConfigRepo: ServerConfigRepository,
    private testAiConnection: TestAiConnectionUseCase
  ) {}

  async execute(
    settings: SystemSettingsPayload,
    options: SaveSystemSettingsOptions = {}
  ): Promise<void> {
    if (settings.AllowSetup !== undefined && !options.actorIsOwner) {
      throw new AppError(
        'Only the server owner can change setup availability',
        DOMAIN_ERROR_STATUS.FORBIDDEN,
        'FORBIDDEN'
      );
    }

    if (settings.DbType === 'remote') {
      await verifyRemoteDatabaseUrl(settings.DbUrl ?? '');
    }

    const config = this.serverConfigRepo.load();
    const smtpPass = resolveMaskedSecret(settings.SmtpPass, config.SmtpPass);

    if (settings.SmtpType === 'remote') {
      await verifyRemoteSmtpTransport({
        host: settings.SmtpHost,
        port: settings.SmtpPort,
        secure: settings.SmtpSecure,
        user: settings.SmtpUser,
        pass: smtpPass,
      });
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
            DOMAIN_ERROR_STATUS.BAD_REQUEST,
            'BAD_REQUEST'
          );
        }
        await this.testAiConnection.execute({
          AiProvider: 'local',
          AiEndpoint: fastEndpoint,
          AiApiKey: fastApiKey,
          AiModel: settings.AiFastModel,
          Mode: 'reachability',
        });
      }
      if (intelligentProvider === 'local') {
        if (!intelligentEndpoint) {
          throw new AppError(
            'API endpoint URL is required for Intelligent local AI provider',
            DOMAIN_ERROR_STATUS.BAD_REQUEST,
            'BAD_REQUEST'
          );
        }
        await this.testAiConnection.execute({
          AiProvider: 'local',
          AiEndpoint: intelligentEndpoint,
          AiApiKey: intelligentApiKey,
          AiModel: settings.AiIntelligentModel,
          Mode: 'reachability',
        });
      }
    }

    const customPacks =
      settings.AiCustomPacks !== undefined
        ? sanitizeCustomPacks(settings.AiCustomPacks)
        : sanitizeCustomPacks(config.AiCustomPacks);
    const catalog = mergeMetadataPackCatalog(METADATA_PACKS_CATALOG, customPacks);

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
      PublicAppUrl: settings.PublicAppUrl?.trim() || config.PublicAppUrl,
      AllowSetup:
        settings.AllowSetup !== undefined
          ? Boolean(settings.AllowSetup)
          : config.AllowSetup,
      OwnerOnboardingCompleted:
        config.OwnerOnboardingCompleted === true || config.AdminOnboardingCompleted === true
          ? true
          : config.OwnerOnboardingCompleted,
      AdminOnboardingCompleted: undefined,
      OAuthEnabled: settings.OAuthEnabled ?? config.OAuthEnabled,
      OAuthIssuerUrl: settings.OAuthIssuerUrl ?? config.OAuthIssuerUrl,
      OAuthClientId: settings.OAuthClientId ?? config.OAuthClientId,
      OAuthClientSecret: resolveMaskedSecret(
        settings.OAuthClientSecret,
        resolveOAuthClientSecret(config) || config.OAuthClientSecret
      ),
      OAuthScopes: settings.OAuthScopes ?? config.OAuthScopes,
      OAuthAutoRegister: settings.OAuthAutoRegister ?? config.OAuthAutoRegister,
      OAuthAutoLaunch: settings.OAuthAutoLaunch ?? config.OAuthAutoLaunch,
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
      AiImportChunkingEnabled:
        (settings.AiImportChunkingEnabled ?? config.AiImportChunkingEnabled) !== false,
      AiImportChunkItemLimit: clampAiImportChunkItemLimit(
        settings.AiImportChunkItemLimit ?? config.AiImportChunkItemLimit
      ),
      AiEnabledPackIds:
        settings.AiEnabledPackIds !== undefined
          ? sanitizeEnabledPackIds(settings.AiEnabledPackIds, catalog)
          : config.AiEnabledPackIds,
      AiCustomPacks:
        settings.AiCustomPacks !== undefined
          ? customPacks.map(toCustomPackSettingsDto)
          : config.AiCustomPacks,
      AiCompletionTimeoutMs: clampAiCompletionTimeoutMs(
        settings.AiCompletionTimeoutMs ?? config.AiCompletionTimeoutMs
      ),
      AiConnectTimeoutMs: clampAiConnectTimeoutMs(
        settings.AiConnectTimeoutMs ?? config.AiConnectTimeoutMs
      ),
      ScrapeFetchTimeoutMs: clampScrapeFetchTimeoutMs(
        settings.ScrapeFetchTimeoutMs ?? config.ScrapeFetchTimeoutMs
      ),
      ScrapePlaywrightTimeoutMs: clampScrapePlaywrightTimeoutMs(
        settings.ScrapePlaywrightTimeoutMs ?? config.ScrapePlaywrightTimeoutMs
      ),
      GrabInfoConcurrency: clampGrabInfoConcurrency(
        settings.GrabInfoConcurrency ?? config.GrabInfoConcurrency
      ),
      GrabInfoConcurrencyUnlimited: normalizeGrabInfoConcurrencyUnlimited(
        settings.GrabInfoConcurrencyUnlimited ?? config.GrabInfoConcurrencyUnlimited
      ),
      GrabInfoActiveStreamLimit: clampGrabInfoActiveStreamLimit(
        settings.GrabInfoActiveStreamLimit ?? config.GrabInfoActiveStreamLimit
      ),
      NtfyEnabled: settings.NtfyEnabled ?? config.NtfyEnabled,
      NtfyBaseUrl: settings.NtfyBaseUrl ?? config.NtfyBaseUrl,
      NtfyAuthToken: resolveMaskedSecret(settings.NtfyAuthToken, config.NtfyAuthToken),
      NtfyTopicPrefix: settings.NtfyTopicPrefix ?? config.NtfyTopicPrefix,
      WebPushEnabled: settings.WebPushEnabled ?? config.WebPushEnabled,
      WebPushVapidPublicKey: settings.WebPushVapidPublicKey ?? config.WebPushVapidPublicKey,
      WebPushVapidPrivateKey: resolveMaskedSecret(
        settings.WebPushVapidPrivateKey,
        config.WebPushVapidPrivateKey
      ),
      WebPushSubject: settings.WebPushSubject ?? config.WebPushSubject,
      FcmEnabled: settings.FcmEnabled ?? config.FcmEnabled,
      FcmProjectId: settings.FcmProjectId ?? config.FcmProjectId,
      FcmServiceAccountJson: resolveMaskedSecret(
        settings.FcmServiceAccountJson,
        config.FcmServiceAccountJson
      ),
    });
  }
}
