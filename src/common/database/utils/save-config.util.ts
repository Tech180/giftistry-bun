import { writeConfigFile } from '@/common/config/utils/server-config-file.util';
import type { ServerConfig } from '@/modules/system';
import { reinitializeDbConnection } from './reinitialize-db-connection.util';

export function saveConfig(config: ServerConfig): void {
  writeConfigFile(config);
  reinitializeDbConnection();
}
