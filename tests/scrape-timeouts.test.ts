import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import {
  clampScrapeFetchTimeoutMs,
  clampScrapePlaywrightTimeoutMs,
  DEFAULT_SCRAPE_FETCH_TIMEOUT_MS,
  DEFAULT_SCRAPE_PLAYWRIGHT_TIMEOUT_MS,
  SCRAPE_FETCH_TIMEOUT_MAX_MS,
  SCRAPE_FETCH_TIMEOUT_MIN_MS,
  SCRAPE_PLAYWRIGHT_TIMEOUT_MAX_MS,
  SCRAPE_PLAYWRIGHT_TIMEOUT_MIN_MS,
  toSystemSettingsView,
} from '../src/modules/system/domain/server-config.entity';

let configState: {
  ScrapeFetchTimeoutMs?: number;
  ScrapePlaywrightTimeoutMs?: number;
} = {};

mock.module('../src/common/infrastructure/config.loader', () => ({
  loadConfig: () => configState,
}));

describe('scrape timeout clamp helpers', () => {
  test('clamps fetch timeout to allowed range', () => {
    expect(clampScrapeFetchTimeoutMs(500)).toBe(SCRAPE_FETCH_TIMEOUT_MIN_MS);
    expect(clampScrapeFetchTimeoutMs(99999)).toBe(SCRAPE_FETCH_TIMEOUT_MAX_MS);
    expect(clampScrapeFetchTimeoutMs(12000)).toBe(12000);
    expect(clampScrapeFetchTimeoutMs('not-a-number')).toBe(DEFAULT_SCRAPE_FETCH_TIMEOUT_MS);
  });

  test('clamps Playwright timeout to allowed range', () => {
    expect(clampScrapePlaywrightTimeoutMs(100)).toBe(SCRAPE_PLAYWRIGHT_TIMEOUT_MIN_MS);
    expect(clampScrapePlaywrightTimeoutMs(999999)).toBe(SCRAPE_PLAYWRIGHT_TIMEOUT_MAX_MS);
    expect(clampScrapePlaywrightTimeoutMs(45000)).toBe(45000);
    expect(clampScrapePlaywrightTimeoutMs(undefined)).toBe(DEFAULT_SCRAPE_PLAYWRIGHT_TIMEOUT_MS);
  });
});

describe('toSystemSettingsView scrape timeouts', () => {
  test('defaults when unset', () => {
    const view = toSystemSettingsView({
      DbType: 'local',
      SmtpType: 'local',
    });

    expect(view.ScrapeFetchTimeoutMs).toBe(DEFAULT_SCRAPE_FETCH_TIMEOUT_MS);
    expect(view.ScrapePlaywrightTimeoutMs).toBe(DEFAULT_SCRAPE_PLAYWRIGHT_TIMEOUT_MS);
  });

  test('returns clamped saved values', () => {
    const view = toSystemSettingsView({
      DbType: 'local',
      SmtpType: 'local',
      ScrapeFetchTimeoutMs: 15000,
      ScrapePlaywrightTimeoutMs: 500,
    });

    expect(view.ScrapeFetchTimeoutMs).toBe(15000);
    expect(view.ScrapePlaywrightTimeoutMs).toBe(SCRAPE_PLAYWRIGHT_TIMEOUT_MIN_MS);
  });
});

describe('getScrape timeouts prefer config over env', () => {
  const originalFetch = process.env.SCRAPE_FETCH_TIMEOUT_MS;
  const originalPlaywright = process.env.SCRAPE_PLAYWRIGHT_TIMEOUT_MS;

  beforeEach(() => {
    configState = {};
    delete process.env.SCRAPE_FETCH_TIMEOUT_MS;
    delete process.env.SCRAPE_PLAYWRIGHT_TIMEOUT_MS;
  });

  afterEach(() => {
    if (originalFetch === undefined) delete process.env.SCRAPE_FETCH_TIMEOUT_MS;
    else process.env.SCRAPE_FETCH_TIMEOUT_MS = originalFetch;
    if (originalPlaywright === undefined) delete process.env.SCRAPE_PLAYWRIGHT_TIMEOUT_MS;
    else process.env.SCRAPE_PLAYWRIGHT_TIMEOUT_MS = originalPlaywright;
  });

  test('uses config values when present', async () => {
    configState = {
      ScrapeFetchTimeoutMs: 12000,
      ScrapePlaywrightTimeoutMs: 40000,
    };
    process.env.SCRAPE_FETCH_TIMEOUT_MS = '3000';
    process.env.SCRAPE_PLAYWRIGHT_TIMEOUT_MS = '5000';

    const {
      getScrapeFetchTimeoutMs,
      getScrapePlaywrightTimeoutMs,
    } = await import('../src/modules/item/infrastructure/scraping/scraping-config');

    expect(getScrapeFetchTimeoutMs()).toBe(12000);
    expect(getScrapePlaywrightTimeoutMs()).toBe(40000);
  });

  test('falls back to env then defaults when config unset', async () => {
    configState = {};
    process.env.SCRAPE_FETCH_TIMEOUT_MS = '9000';
    delete process.env.SCRAPE_PLAYWRIGHT_TIMEOUT_MS;

    const {
      getScrapeFetchTimeoutMs,
      getScrapePlaywrightTimeoutMs,
    } = await import('../src/modules/item/infrastructure/scraping/scraping-config');

    expect(getScrapeFetchTimeoutMs()).toBe(9000);
    expect(getScrapePlaywrightTimeoutMs()).toBe(DEFAULT_SCRAPE_PLAYWRIGHT_TIMEOUT_MS);
  });
});
