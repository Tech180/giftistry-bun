import type { ServerConfig } from '../interfaces/server-config.interface';
import { clampGrabInfoConcurrency } from './clamp-server-config-limits.util';
import { normalizeGrabInfoConcurrencyUnlimited } from './normalize-grab-info-concurrency-unlimited.util';

/** Effective mapPool size for grab phase: unlimited uses remaining work count. */
export function resolveGrabInfoConcurrency(
  config: Pick<ServerConfig, 'GrabInfoConcurrency' | 'GrabInfoConcurrencyUnlimited'>,
  workCount: number
): number {
  if (normalizeGrabInfoConcurrencyUnlimited(config.GrabInfoConcurrencyUnlimited)) {
    return Math.max(1, workCount);
  }
  return clampGrabInfoConcurrency(config.GrabInfoConcurrency);
}
