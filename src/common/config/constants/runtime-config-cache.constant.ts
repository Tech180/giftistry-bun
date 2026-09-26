import type { RuntimeConfig } from '../interfaces/runtime-config.interface';

/** Process-wide cached result of `loadRuntimeConfig()`. */
export const RUNTIME_CONFIG_CACHE: { current: RuntimeConfig | null } = {
  current: null,
};
