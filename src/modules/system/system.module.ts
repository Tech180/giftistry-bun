import { Elysia } from 'elysia';
import type { ServerConfigRepository } from './domain/ports/server-config.repository';
import type { GetSitePolicyUseCase } from '@/common/application/get-site-policy.use-case';
import type { WriteAuditLogUseCase } from '@/common/application/write-audit-log.use-case';
import { GetSystemStatusUseCase } from './application/get-system-status.use-case';
import { RunInitialSetupUseCase } from './application/run-initial-setup.use-case';
import { GetSystemSettingsUseCase } from './application/get-system-settings.use-case';
import { SaveSystemSettingsUseCase } from './application/save-system-settings.use-case';
import { TransferOwnershipUseCase } from './application/transfer-ownership.use-case';
import { DeleteServerUseCase } from './application/delete-server.use-case';
import { systemRoutes } from './presentation/system.routes';
import type { SystemUseCases } from './presentation/system-use-cases.interface';

export interface SystemModuleDeps {
  serverConfigRepo: ServerConfigRepository;
  getSitePolicyUseCase: GetSitePolicyUseCase;
  writeAuditLogUseCase: WriteAuditLogUseCase;
}

export function createSystemModule(deps: SystemModuleDeps): {
  module: Elysia;
  systemUseCases: SystemUseCases;
} {
  const systemUseCases: SystemUseCases = {
    getSystemStatus: new GetSystemStatusUseCase(deps.serverConfigRepo, deps.getSitePolicyUseCase),
    runInitialSetup: new RunInitialSetupUseCase(deps.serverConfigRepo),
    getSystemSettings: new GetSystemSettingsUseCase(deps.serverConfigRepo),
    saveSystemSettings: new SaveSystemSettingsUseCase(deps.serverConfigRepo),
    transferOwnership: new TransferOwnershipUseCase(deps.serverConfigRepo, deps.writeAuditLogUseCase),
    deleteServer: new DeleteServerUseCase(deps.serverConfigRepo, deps.writeAuditLogUseCase),
  };

  return {
    module: new Elysia().use(systemRoutes(systemUseCases)),
    systemUseCases,
  };
}
