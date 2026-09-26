/** Chromium launch args used by the shared Playwright manager. */
export const PLAYWRIGHT_LAUNCH_ARGS = [
  '--disable-blink-features=AutomationControlled',
  '--no-sandbox',
  '--disable-dev-shm-usage',
] as const;

export const PLAYWRIGHT_CONTEXT_VIEWPORT = { width: 1366, height: 768 } as const;

export const PLAYWRIGHT_CONTEXT_EXTRA_HEADERS = {
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
} as const;
