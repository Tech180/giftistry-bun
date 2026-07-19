import { join, resolve } from 'path';
import { env } from '@/common/consts/env.consts';

export function getConfigFilePath(): string {
  if (env.GIFTISTRY_CONFIG_PATH) {
    return resolve(env.GIFTISTRY_CONFIG_PATH);
  }
  return join(process.cwd(), 'config.json');
}
