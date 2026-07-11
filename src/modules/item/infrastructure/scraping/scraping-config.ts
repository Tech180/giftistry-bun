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

export const CHROME_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

export const scrapingConfig = {
  fetchTimeoutMs: parseIntEnv('SCRAPE_FETCH_TIMEOUT_MS', 8000),
  playwrightTimeoutMs: parseIntEnv('SCRAPE_PLAYWRIGHT_TIMEOUT_MS', 25000),
  playwrightMaxConcurrent: parseIntEnv('SCRAPE_PLAYWRIGHT_MAX_CONCURRENT', 3),
  playwrightHeadless: parseBoolEnv('SCRAPE_PLAYWRIGHT_HEADLESS', true),
  userAgent: CHROME_USER_AGENT,
} as const;
