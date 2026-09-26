import * as fs from 'fs';
import { getConfigFilePath } from '@/common/utils/config-path.util';
import { buildPersistedServerConfig, type ServerConfig } from '@/modules/system';
import {
  needsServerConfigRewrite,
  normalizeServerConfig,
} from './normalize-server-config.util';

export function writeConfigFile(config: ServerConfig): void {
  const configPath = getConfigFilePath();
  const persisted = buildPersistedServerConfig(config);
  fs.writeFileSync(configPath, JSON.stringify(persisted, null, 2), 'utf-8');
}

export function loadConfig(): ServerConfig {
  const configPath = getConfigFilePath();
  if (fs.existsSync(configPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as Record<string, unknown>;
      const config = buildPersistedServerConfig(normalizeServerConfig(data));
      if (needsServerConfigRewrite(data)) {
        writeConfigFile(config);
      }
      return config;
    } catch {
      // ignore
    }
  }
  return buildPersistedServerConfig();
}
