import type { ServerConfigRepository } from '../../../domain/ports/server-config.repository';
import type { SystemSettingsView } from '../../../domain/interfaces/system-settings-view.interface';
import { toSystemSettingsView } from '../../../domain/utils/to-system-settings-view.util';

export class GetSystemSettingsUseCase {
  constructor(private serverConfigRepo: ServerConfigRepository) {}

  execute(): SystemSettingsView {
    const config = this.serverConfigRepo.load();
    return toSystemSettingsView(config);
  }
}
