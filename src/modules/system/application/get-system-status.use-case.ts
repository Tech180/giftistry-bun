import { env } from '@/common/consts/runtime-config';
import type { GetSitePolicyUseCase } from '@/common/application/get-site-policy.use-case';
import type { ServerConfigRepository } from '../domain/ports/server-config.repository';

export class GetSystemStatusUseCase {
  constructor(
    private serverConfigRepo: ServerConfigRepository,
    private getSitePolicy: GetSitePolicyUseCase
  ) {}

  async execute(): Promise<{
    Initialized: boolean;
    AllowSetup: boolean;
    AiEnabled: boolean;
    AiWebSearchEnabled: boolean;
    MaintenanceMode: boolean;
    MaintenanceMessage: string;
    RegistrationMode: string;
    OAuthEnabled: boolean;
    AllowPasswordLogin: boolean;
    RequireStrongPasswords: boolean;
  }> {
    const initialized = await this.serverConfigRepo.isSystemInitialized();
    const config = this.serverConfigRepo.load();
    const sitePolicy = await this.getSitePolicy.execute();

    const allowSetup =
      env.GIFTISTRY_ALLOW_SETUP && config.AllowSetup !== false && !initialized;

    return {
      Initialized: initialized,
      AllowSetup: allowSetup,
      AiEnabled: config.AiEnabled ?? false,
      AiWebSearchEnabled: config.AiWebSearchEnabled ?? false,
      MaintenanceMode: sitePolicy.MaintenanceMode,
      MaintenanceMessage: sitePolicy.MaintenanceMessage,
      RegistrationMode: sitePolicy.RegistrationMode,
      OAuthEnabled: !!config.OAuthEnabled,
      AllowPasswordLogin: sitePolicy.AllowPasswordLogin,
      RequireStrongPasswords: sitePolicy.RequireStrongPasswords,
    };
  }
}
