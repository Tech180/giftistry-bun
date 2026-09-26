import { join, resolve } from 'path';
import { getEnv } from '@/common/config/utils/get-env.util';

export function getConfigFilePath(): string {
  const configPath = getEnv().GIFTISTRY_CONFIG_PATH;
  if (configPath) {
    return resolve(configPath);
  }
  return join(process.cwd(), 'config.json');
}
