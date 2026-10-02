import type { ServerConfig } from '../interfaces/server-config.interface';
import { buildPersistedServerConfig } from '../utils/build-persisted-server-config.util';

/** Keys always written to config.json (excludes deprecated AdminOnboardingCompleted). */
export const PERSISTED_SERVER_CONFIG_KEYS = Object.keys(
  buildPersistedServerConfig()
) as (keyof ServerConfig)[];
