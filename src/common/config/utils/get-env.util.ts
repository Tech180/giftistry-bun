import { RUNTIME_CONFIG_CACHE } from '../constants/runtime-config-cache.constant';
import type { RuntimeConfig } from '../interfaces/runtime-config.interface';
import { loadRuntimeConfig } from '../runtime-config';

/** Lazy singleton used by the rest of the app (boot validates JWT on first access). */
export function getEnv(): RuntimeConfig {
  if (!RUNTIME_CONFIG_CACHE.current) {
    RUNTIME_CONFIG_CACHE.current = loadRuntimeConfig();
  }
  return RUNTIME_CONFIG_CACHE.current;
}

/** Test helper. */
export function setEnvForTests(config: RuntimeConfig | null): void {
  RUNTIME_CONFIG_CACHE.current = config;
}
