import type { GetSitePolicyUseCase } from '@/common/application/get-site-policy.use-case';
import type { ServerConfigRepository } from '../domain/ports/server-config.repository';

export class GetSystemStatusUseCase {
  constructor(
    private serverConfigRepo: ServerConfigRepository,
    private getSitePolicy: GetSitePolicyUseCase
  ) {}

  async execute(): Promise<{
    initialized: boolean;
    aiEnabled: boolean;
    maintenanceMode: boolean;
    maintenanceMessage: string;
    registrationMode: string;
  }> {
    const initialized = await this.serverConfigRepo.isSystemInitialized();
    const config = this.serverConfigRepo.load();
    const sitePolicy = await this.getSitePolicy.execute();

    return {
      initialized,
      aiEnabled: config.aiEnabled ?? false,
      maintenanceMode: sitePolicy.maintenanceMode,
      maintenanceMessage: sitePolicy.maintenanceMessage,
      registrationMode: sitePolicy.registrationMode,
    };
  }
}
