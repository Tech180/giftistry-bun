/** Slack added on top of fetch + Playwright timeouts for the default total scrape budget. */
export const SCRAPE_TOTAL_BUDGET_SLACK_MS = 10_000;

/** Below this remaining budget a new acquisition tier or navigation is not started. */
export const SCRAPE_MIN_TIER_BUDGET_MS = 1_000;

/** Below this remaining budget Amazon post-gate / reload navigation retries are skipped. */
export const AMAZON_NAV_RETRY_MIN_BUDGET_MS = 5_000;
