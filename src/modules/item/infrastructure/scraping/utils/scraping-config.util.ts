import { parseBool } from '@/common/config/utils/parse-bool.util';
import { CHROME_USER_AGENT } from '../constants/chrome-user-agent.constant';
import { SCRAPE_TOTAL_BUDGET_SLACK_MS } from '../constants/scrape-budget.constant';
import {
  DEFAULT_SCRAPE_MAX_HTML_BYTES,
  DEFAULT_SCRAPE_PLAYWRIGHT_MAX_CONCURRENT,
  DEFAULT_SCRAPE_QUEUE_TIMEOUT_MS,
} from '../constants/scraping-defaults.constant';
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
  /** Total wall-clock budget for one scrape (all tiers); env override or fetch + Playwright + slack. */
  get totalBudgetMs() {
    return parsePositiveIntEnv(
      'SCRAPE_TOTAL_BUDGET_MS',
      getScrapeFetchTimeoutMs() + getScrapePlaywrightTimeoutMs() + SCRAPE_TOTAL_BUDGET_SLACK_MS
    );
  },
  playwrightMaxConcurrent: parsePositiveIntEnv(
    'SCRAPE_PLAYWRIGHT_MAX_CONCURRENT',
    DEFAULT_SCRAPE_PLAYWRIGHT_MAX_CONCURRENT
  ),
  queueTimeoutMs: parsePositiveIntEnv('SCRAPE_QUEUE_TIMEOUT_MS', DEFAULT_SCRAPE_QUEUE_TIMEOUT_MS),
  maxHtmlBytes: parsePositiveIntEnv('SCRAPE_MAX_HTML_BYTES', DEFAULT_SCRAPE_MAX_HTML_BYTES),
  playwrightHeadless: parseBool(process.env.SCRAPE_PLAYWRIGHT_HEADLESS, true),
  playwrightExecutablePath:
    parseOptionalStringEnv('SCRAPE_PLAYWRIGHT_EXECUTABLE_PATH') ??
    parseOptionalStringEnv('PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH'),
  userAgent: CHROME_USER_AGENT,
};
