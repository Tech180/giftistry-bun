import { parseBool } from '@/common/config/utils/parse-bool.util';
import { CHROME_USER_AGENT } from '../constants/chrome-user-agent.constant';
import { DEFAULT_SCRAPE_PLAYWRIGHT_MAX_CONCURRENT } from '../constants/scraping-defaults.constant';
import { parseOptionalStringEnv, parsePositiveIntEnv } from './parse-env.util';
import {
  getScrapeFetchTimeoutMs,
  getScrapePlaywrightTimeoutMs,
} from './resolve-scrape-timeout-ms.util';

export const scrapingConfig = {
  get fetchTimeoutMs() {
    return getScrapeFetchTimeoutMs();
  },
  get playwrightTimeoutMs() {
    return getScrapePlaywrightTimeoutMs();
  },
  playwrightMaxConcurrent: parsePositiveIntEnv(
    'SCRAPE_PLAYWRIGHT_MAX_CONCURRENT',
    DEFAULT_SCRAPE_PLAYWRIGHT_MAX_CONCURRENT
  ),
  playwrightHeadless: parseBool(process.env.SCRAPE_PLAYWRIGHT_HEADLESS, true),
  playwrightExecutablePath:
    parseOptionalStringEnv('SCRAPE_PLAYWRIGHT_EXECUTABLE_PATH') ??
    parseOptionalStringEnv('PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH'),
  userAgent: CHROME_USER_AGENT,
};
