import { loadConfig } from '@/common/config/utils/server-config-file.util';
import {
  clampScrapeFetchTimeoutMs,
  clampScrapePlaywrightTimeoutMs,
  DEFAULT_SCRAPE_FETCH_TIMEOUT_MS,
  DEFAULT_SCRAPE_PLAYWRIGHT_TIMEOUT_MS,
} from '@/modules/system';
import { parsePositiveIntEnv } from './parse-env.util';

export function getScrapeFetchTimeoutMs(): number {
  try {
    const config = loadConfig();
    if (config.ScrapeFetchTimeoutMs !== undefined && Number.isFinite(config.ScrapeFetchTimeoutMs)) {
      return clampScrapeFetchTimeoutMs(config.ScrapeFetchTimeoutMs);
    }
  } catch {
    /* config may be unavailable during early boot */
  }
  return clampScrapeFetchTimeoutMs(
    parsePositiveIntEnv('SCRAPE_FETCH_TIMEOUT_MS', DEFAULT_SCRAPE_FETCH_TIMEOUT_MS)
  );
}

export function getScrapePlaywrightTimeoutMs(): number {
  try {
    const config = loadConfig();
    if (
      config.ScrapePlaywrightTimeoutMs !== undefined &&
      Number.isFinite(config.ScrapePlaywrightTimeoutMs)
    ) {
      return clampScrapePlaywrightTimeoutMs(config.ScrapePlaywrightTimeoutMs);
    }
  } catch {
    /* config may be unavailable during early boot */
  }
  return clampScrapePlaywrightTimeoutMs(
    parsePositiveIntEnv('SCRAPE_PLAYWRIGHT_TIMEOUT_MS', DEFAULT_SCRAPE_PLAYWRIGHT_TIMEOUT_MS)
  );
}
