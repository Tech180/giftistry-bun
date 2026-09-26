import { getEnv } from '@/common/config/utils/get-env.util';
import type { GetSitePolicyUseCase } from '@/common/application/use-cases/get-site-policy.use-case';
import type { ServerConfigRepository } from '../../../domain/ports/server-config.repository';
import type { SystemStatus } from '../interfaces/system-status.interface';

export class GetSystemStatusUseCase {
  constructor(
    private serverConfigRepo: ServerConfigRepository,
    private getSitePolicy: GetSitePolicyUseCase
  ) {}

  async execute(): Promise<SystemStatus> {
    const initialized = await this.serverConfigRepo.isSystemInitialized();
    const config = this.serverConfigRepo.load();
    const sitePolicy = await this.getSitePolicy.execute();

    const allowSetup =
      getEnv().GIFTISTRY_ALLOW_SETUP && config.AllowSetup !== false && !initialized;

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
