import { Elysia, type AnyElysia } from 'elysia';
import type { SystemModuleDeps } from './interfaces/system-module-deps.interface';
import type { UseCases } from './presentation/interfaces/use-cases.interface';
import { systemRoutes } from './presentation/system.routes';
import { ListSystemModelsUseCase } from './slices/ai/use-cases/list-system-models.use-case';
import { TestAiConnectionUseCase } from './slices/ai/use-cases/test-ai-connection.use-case';
import { GetMetadataPacksUseCase } from './slices/packs/use-cases/get-metadata-packs.use-case';
import { DeleteServerUseCase } from './slices/settings/use-cases/delete-server.use-case';
import { GetPushConfigPublicUseCase } from './slices/settings/use-cases/get-push-config-public.use-case';
import { GetSystemSettingsUseCase } from './slices/settings/use-cases/get-system-settings.use-case';
import { GetSystemStatusUseCase } from './slices/settings/use-cases/get-system-status.use-case';
import { RunInitialSetupUseCase } from './slices/settings/use-cases/run-initial-setup.use-case';
import { SaveSystemSettingsUseCase } from './slices/settings/use-cases/save-system-settings.use-case';
import { TestNtfyUseCase } from './slices/settings/use-cases/test-ntfy.use-case';
import { TransferOwnershipUseCase } from './slices/settings/use-cases/transfer-ownership.use-case';

export function createSystemModule(deps: SystemModuleDeps): {
  module: AnyElysia;
  systemUseCases: UseCases;
} {
  const testAiConnectionUseCase = new TestAiConnectionUseCase();
  const listSystemModelsUseCase = new ListSystemModelsUseCase();

  const systemUseCases: UseCases = {
    getSystemStatus: new GetSystemStatusUseCase(deps.serverConfigRepo, deps.getSitePolicyUseCase),
    runInitialSetup: new RunInitialSetupUseCase(deps.serverConfigRepo, deps.saveSitePolicyUseCase),
    getSystemSettings: new GetSystemSettingsUseCase(deps.serverConfigRepo),
    saveSystemSettings: new SaveSystemSettingsUseCase(
      deps.serverConfigRepo,
      testAiConnectionUseCase
    ),
    testAiConnection: testAiConnectionUseCase,
    listSystemModels: listSystemModelsUseCase,
    getMetadataPacks: new GetMetadataPacksUseCase(deps.serverConfigRepo),
    getPushConfigPublic: new GetPushConfigPublicUseCase(deps.serverConfigRepo),
    testNtfy: new TestNtfyUseCase(deps.serverConfigRepo),
    transferOwnership: new TransferOwnershipUseCase(
      deps.serverConfigRepo,
      deps.writeAuditLogUseCase
    ),
    deleteServer: new DeleteServerUseCase(deps.serverConfigRepo, deps.writeAuditLogUseCase),
  };

  return {
    module: new Elysia().use(systemRoutes(systemUseCases)),
    systemUseCases,
  };
}
