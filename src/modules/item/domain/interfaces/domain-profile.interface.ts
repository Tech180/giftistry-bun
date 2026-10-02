export interface DomainProfile {
  hostname: string;
  /** Minimum milliseconds between scrape requests to this host. */
  minIntervalMs?: number;
}
