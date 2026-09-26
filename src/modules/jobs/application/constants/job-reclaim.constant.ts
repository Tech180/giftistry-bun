/** Reclaim age on boot — reclaim anything still marked running. */
export const BOOT_RECLAIM_MS = 0;

/** Above max configurable AI completion timeout (30m) so live grabs are not re-queued mid-flight. */
export const PERIODIC_RECLAIM_MS = 35 * 60 * 1000;

export const PERIODIC_RECLAIM_INTERVAL_MS = 2 * 60 * 1000;
