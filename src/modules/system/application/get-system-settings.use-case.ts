import type { ServerConfigRepository } from '../domain/ports/server-config.repository';
import { toSystemSettingsView, type SystemSettingsView } from '../domain/server-config.entity';

export class GetSystemSettingsUseCase {
  constructor(private serverConfigRepo: ServerConfigRepository) {}

  execute(): SystemSettingsView {
    const config = this.serverConfigRepo.load();
    return toSystemSettingsView(config);
  }
}
