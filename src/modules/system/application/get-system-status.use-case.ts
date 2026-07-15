import type { GetSitePolicyUseCase } from '@/common/application/get-site-policy.use-case';
import type { ServerConfigRepository } from '../domain/ports/server-config.repository';

export class GetSystemStatusUseCase {
  constructor(
    private serverConfigRepo: ServerConfigRepository,
    private getSitePolicy: GetSitePolicyUseCase
  ) {}

  async execute(): Promise<{
    Initialized: boolean;
    AiEnabled: boolean;
    AiWebSearchEnabled: boolean;
    MaintenanceMode: boolean;
    MaintenanceMessage: string;
    RegistrationMode: string;
  }> {
    const initialized = await this.serverConfigRepo.isSystemInitialized();
    const config = this.serverConfigRepo.load();
    const sitePolicy = await this.getSitePolicy.execute();

    return {
      Initialized: initialized,
      AiEnabled: config.AiEnabled ?? false,
      AiWebSearchEnabled: config.AiWebSearchEnabled ?? false,
      MaintenanceMode: sitePolicy.MaintenanceMode,
      MaintenanceMessage: sitePolicy.MaintenanceMessage,
      RegistrationMode: sitePolicy.RegistrationMode,
    };
  }
}
