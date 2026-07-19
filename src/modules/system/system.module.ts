import type { GetSitePolicyUseCase } from '@/common/application/get-site-policy.use-case';
import type { SaveSitePolicyUseCase } from '@/common/application/save-site-policy.use-case';
import type { WriteAuditLogUseCase } from '@/common/application/write-audit-log.use-case';
import { GetSystemStatusUseCase } from './application/get-system-status.use-case';
import { RunInitialSetupUseCase } from './application/run-initial-setup.use-case';
import { GetSystemSettingsUseCase } from './application/get-system-settings.use-case';
import { SaveSystemSettingsUseCase } from './application/save-system-settings.use-case';
import { TransferOwnershipUseCase } from './application/transfer-ownership.use-case';
import { DeleteServerUseCase } from './application/delete-server.use-case';
import { TestAiConnectionUseCase } from './application/test-ai-connection.use-case';
import { ListSystemModelsUseCase } from './application/list-system-models.use-case';
import { systemRoutes } from './presentation/system.routes';
import type { SystemUseCases } from './presentation/system-use-cases.interface';
import { Elysia } from 'elysia';
import type { ServerConfigRepository } from './domain/ports/server-config.repository';

export interface SystemModuleDeps {
  serverConfigRepo: ServerConfigRepository;
  getSitePolicyUseCase: GetSitePolicyUseCase;
  saveSitePolicyUseCase: SaveSitePolicyUseCase;
  writeAuditLogUseCase: WriteAuditLogUseCase;
}

export function createSystemModule(deps: SystemModuleDeps): {
  module: Elysia;
  systemUseCases: SystemUseCases;
} {
  const testAiConnectionUseCase = new TestAiConnectionUseCase();
  const listSystemModelsUseCase = new ListSystemModelsUseCase();

  const systemUseCases: SystemUseCases = {
    getSystemStatus: new GetSystemStatusUseCase(deps.serverConfigRepo, deps.getSitePolicyUseCase),
    runInitialSetup: new RunInitialSetupUseCase(deps.serverConfigRepo, deps.saveSitePolicyUseCase),
    getSystemSettings: new GetSystemSettingsUseCase(deps.serverConfigRepo),
    saveSystemSettings: new SaveSystemSettingsUseCase(deps.serverConfigRepo, testAiConnectionUseCase),
    testAiConnection: testAiConnectionUseCase,
    listSystemModels: listSystemModelsUseCase,
    transferOwnership: new TransferOwnershipUseCase(deps.serverConfigRepo, deps.writeAuditLogUseCase),
    deleteServer: new DeleteServerUseCase(deps.serverConfigRepo, deps.writeAuditLogUseCase),
  };

  return {
    module: new Elysia().use(systemRoutes(systemUseCases)),
    systemUseCases,
  };
}
