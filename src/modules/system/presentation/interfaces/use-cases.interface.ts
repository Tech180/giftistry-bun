import type { GetSystemStatusUseCase } from '../../slices/settings/use-cases/get-system-status.use-case';
import type { RunInitialSetupUseCase } from '../../slices/settings/use-cases/run-initial-setup.use-case';
import type { GetSystemSettingsUseCase } from '../../slices/settings/use-cases/get-system-settings.use-case';
import type { SaveSystemSettingsUseCase } from '../../slices/settings/use-cases/save-system-settings.use-case';
import type { TransferOwnershipUseCase } from '../../slices/settings/use-cases/transfer-ownership.use-case';
import type { DeleteServerUseCase } from '../../slices/settings/use-cases/delete-server.use-case';
import type { TestAiConnectionUseCase } from '../../slices/ai/use-cases/test-ai-connection.use-case';
import type { ListSystemModelsUseCase } from '../../slices/ai/use-cases/list-system-models.use-case';
import type { GetMetadataPacksUseCase } from '../../slices/packs/use-cases/get-metadata-packs.use-case';
import type { GetPushConfigPublicUseCase } from '../../slices/settings/use-cases/get-push-config-public.use-case';
import type { TestNtfyUseCase } from '../../slices/settings/use-cases/test-ntfy.use-case';

export interface UseCases {
  getSystemStatus: GetSystemStatusUseCase;
  runInitialSetup: RunInitialSetupUseCase;
  getSystemSettings: GetSystemSettingsUseCase;
  saveSystemSettings: SaveSystemSettingsUseCase;
  testAiConnection: TestAiConnectionUseCase;
  listSystemModels: ListSystemModelsUseCase;
  getMetadataPacks: GetMetadataPacksUseCase;
  getPushConfigPublic: GetPushConfigPublicUseCase;
  testNtfy: TestNtfyUseCase;
  transferOwnership: TransferOwnershipUseCase;
  deleteServer: DeleteServerUseCase;
}
