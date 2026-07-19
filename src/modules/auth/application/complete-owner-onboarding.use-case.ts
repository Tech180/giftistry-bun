import type { UserRepository } from '../domain/ports/user.repository';
import type { ServerConfigRepository } from '@/modules/system/domain/ports/server-config.repository';
import type { SaveSitePolicyUseCase } from '@/common/application/save-site-policy.use-case';
import type { SaveSystemSettingsUseCase } from '@/modules/system/application/save-system-settings.use-case';
import type { GetSitePolicyUseCase } from '@/common/application/get-site-policy.use-case';
import type { SystemSettingsPayload } from '@/modules/system/domain/server-config.entity';
import { AppError } from '@/common/middlewares/error.middleware';
import { isOwnerOnboardingCompleted } from '@/modules/system/domain/owner-onboarding.util';

export interface CompleteOwnerOnboardingPayload {
  Skip?: boolean;
  PublicAppUrl?: string;
  RegistrationMode?: 'open' | 'invite_only' | 'disabled';
  SmtpType?: 'local' | 'remote';
  SmtpHost?: string;
  SmtpPort?: number;
  SmtpUser?: string;
  SmtpPass?: string;
  SmtpSecure?: boolean;
  SmtpFrom?: string;
  AiEnabled?: boolean;
  AiWebSearchEnabled?: boolean;
}

export class CompleteOwnerOnboardingUseCase {
  constructor(
    private userRepo: UserRepository,
    private serverConfigRepo: ServerConfigRepository,
    private getSitePolicy: GetSitePolicyUseCase,
    private saveSitePolicy: SaveSitePolicyUseCase,
    private saveSystemSettings: SaveSystemSettingsUseCase
  ) {}

  async execute(
    userId: string,
    payload: CompleteOwnerOnboardingPayload = {}
  ): Promise<{ OwnerOnboardingCompleted: boolean }> {
    const config = this.serverConfigRepo.load();
    if (isOwnerOnboardingCompleted(config)) {
      return { OwnerOnboardingCompleted: true };
    }

    const user = await this.userRepo.findById(userId);
    if (!user?.IsOwner) {
      throw new AppError('Forbidden: Owner access required', 403, 'FORBIDDEN');
    }

    if (!payload.Skip) {
      const currentPolicy = await this.getSitePolicy.execute();
      if (payload.RegistrationMode) {
        await this.saveSitePolicy.execute({
          ...currentPolicy,
          RegistrationMode: payload.RegistrationMode,
        });
      }

      const settingsPatch: Partial<SystemSettingsPayload> = {};
      if (payload.PublicAppUrl !== undefined) settingsPatch.PublicAppUrl = payload.PublicAppUrl;
      if (payload.SmtpType !== undefined) settingsPatch.SmtpType = payload.SmtpType;
      if (payload.SmtpHost !== undefined) settingsPatch.SmtpHost = payload.SmtpHost;
      if (payload.SmtpPort !== undefined) settingsPatch.SmtpPort = payload.SmtpPort;
      if (payload.SmtpUser !== undefined) settingsPatch.SmtpUser = payload.SmtpUser;
      if (payload.SmtpPass !== undefined) settingsPatch.SmtpPass = payload.SmtpPass;
      if (payload.SmtpSecure !== undefined) settingsPatch.SmtpSecure = payload.SmtpSecure;
      if (payload.SmtpFrom !== undefined) settingsPatch.SmtpFrom = payload.SmtpFrom;
      if (payload.AiEnabled !== undefined) settingsPatch.AiEnabled = payload.AiEnabled;
      if (payload.AiWebSearchEnabled !== undefined) {
        settingsPatch.AiWebSearchEnabled = payload.AiWebSearchEnabled;
      }

      if (Object.keys(settingsPatch).length > 0) {
        await this.saveSystemSettings.execute({
          DbType: config.DbType,
          DbUrl: config.DbUrl,
          SmtpType: payload.SmtpType ?? config.SmtpType,
          SmtpHost: payload.SmtpHost ?? config.SmtpHost,
          SmtpPort: payload.SmtpPort ?? config.SmtpPort,
          SmtpUser: payload.SmtpUser ?? config.SmtpUser,
          SmtpPass: payload.SmtpPass ?? config.SmtpPass,
          SmtpSecure: payload.SmtpSecure ?? config.SmtpSecure,
          SmtpFrom: payload.SmtpFrom ?? config.SmtpFrom,
          PublicAppUrl: payload.PublicAppUrl ?? config.PublicAppUrl,
          AiEnabled: payload.AiEnabled ?? config.AiEnabled,
          AiWebSearchEnabled: payload.AiWebSearchEnabled ?? config.AiWebSearchEnabled,
          ...settingsPatch,
        });
      }
    }

    const latest = this.serverConfigRepo.load();
    this.serverConfigRepo.save({
      ...latest,
      OwnerOnboardingCompleted: true,
      AdminOnboardingCompleted: undefined,
    });

    return { OwnerOnboardingCompleted: true };
  }
}
