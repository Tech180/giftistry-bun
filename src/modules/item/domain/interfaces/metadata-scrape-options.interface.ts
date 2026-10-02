export interface MetadataScrapeOptions {
  /** When false, caller records telemetry (e.g. extract-metadata). Default true. */
  recordTelemetry?: boolean;
  /** Optional wall-clock budget for acquisition (HTTP + Playwright). */
  deadlineMs?: number;
  /** When true, bypass scrape HTML cache reads (writes still apply when enabled). */
  refreshCache?: boolean;
}
