import { scrapingConfig } from '../../utils/scraping-config.util';
import { boundTimeoutMs } from '../../utils/scrape-deadline.util';

/** Per-tier timeout: the tier default, capped by whatever remains of the total scrape budget. */
export function resolveAcquisitionTimeoutMs(
  deadlineAt: number | undefined,
  defaultMs: number,
  now: number = Date.now()
): number {
  return boundTimeoutMs(defaultMs, deadlineAt, now);
}

export function resolveHttpFetchTimeoutMs(deadlineAt?: number): number {
  return resolveAcquisitionTimeoutMs(deadlineAt, scrapingConfig.fetchTimeoutMs);
}

export function resolvePlaywrightFetchTimeoutMs(deadlineAt?: number): number {
  return resolveAcquisitionTimeoutMs(deadlineAt, scrapingConfig.playwrightTimeoutMs);
}
