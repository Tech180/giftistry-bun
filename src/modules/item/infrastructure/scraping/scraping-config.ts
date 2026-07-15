import { loadConfig } from '@/common/infrastructure/config.loader';
import {
  clampScrapeFetchTimeoutMs,
  clampScrapePlaywrightTimeoutMs,
  DEFAULT_SCRAPE_FETCH_TIMEOUT_MS,
  DEFAULT_SCRAPE_PLAYWRIGHT_TIMEOUT_MS,
} from '@/modules/system/domain/server-config.entity';

function parseIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseBoolEnv(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  return raw === '1' || raw.toLowerCase() === 'true';
}

function parseStringEnv(name: string): string | undefined {
  const raw = process.env[name]?.trim();
  return raw ? raw : undefined;
}

export const CHROME_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

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
    parseIntEnv('SCRAPE_FETCH_TIMEOUT_MS', DEFAULT_SCRAPE_FETCH_TIMEOUT_MS)
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
    parseIntEnv('SCRAPE_PLAYWRIGHT_TIMEOUT_MS', DEFAULT_SCRAPE_PLAYWRIGHT_TIMEOUT_MS)
  );
}

export const scrapingConfig = {
  get fetchTimeoutMs() {
    return getScrapeFetchTimeoutMs();
  },
  get playwrightTimeoutMs() {
    return getScrapePlaywrightTimeoutMs();
  },
  playwrightMaxConcurrent: parseIntEnv('SCRAPE_PLAYWRIGHT_MAX_CONCURRENT', 3),
  playwrightHeadless: parseBoolEnv('SCRAPE_PLAYWRIGHT_HEADLESS', true),
  playwrightExecutablePath:
    parseStringEnv('SCRAPE_PLAYWRIGHT_EXECUTABLE_PATH') ??
    parseStringEnv('PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH'),
  userAgent: CHROME_USER_AGENT,
};
