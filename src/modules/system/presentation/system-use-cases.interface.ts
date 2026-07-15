import type { GetSystemStatusUseCase } from '../application/get-system-status.use-case';
import type { RunInitialSetupUseCase } from '../application/run-initial-setup.use-case';
import type { GetSystemSettingsUseCase } from '../application/get-system-settings.use-case';
import type { SaveSystemSettingsUseCase } from '../application/save-system-settings.use-case';
import type { TransferOwnershipUseCase } from '../application/transfer-ownership.use-case';
import type { DeleteServerUseCase } from '../application/delete-server.use-case';
import type { TestAiConnectionUseCase } from '../application/test-ai-connection.use-case';
import type { ListSystemModelsUseCase } from '../application/list-system-models.use-case';

export interface SystemUseCases {
  getSystemStatus: GetSystemStatusUseCase;
  runInitialSetup: RunInitialSetupUseCase;
  getSystemSettings: GetSystemSettingsUseCase;
  saveSystemSettings: SaveSystemSettingsUseCase;
  testAiConnection: TestAiConnectionUseCase;
  listSystemModels: ListSystemModelsUseCase;
  transferOwnership: TransferOwnershipUseCase;
  deleteServer: DeleteServerUseCase;
}
