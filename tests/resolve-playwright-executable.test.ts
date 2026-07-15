import { describe, expect, test } from 'bun:test';
import {
  isLikelyNixOs,
  playwrightLaunchHint,
  resolvePlaywrightExecutablePath,
} from '../src/modules/item/infrastructure/scraping/resolve-playwright-executable';

describe('resolvePlaywrightExecutablePath', () => {
  test('prefers SCRAPE_PLAYWRIGHT_EXECUTABLE_PATH when the file exists', () => {
    const path = resolvePlaywrightExecutablePath({
      SCRAPE_PLAYWRIGHT_EXECUTABLE_PATH: '/etc/NIXOS',
      PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH: '/does/not/exist',
    });
    expect(path).toBe('/etc/NIXOS');
  });

  test('ignores missing env paths', () => {
    const path = resolvePlaywrightExecutablePath({
      SCRAPE_PLAYWRIGHT_EXECUTABLE_PATH: '/definitely/missing/chromium',
      PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH: '/also/missing',
      PATH: '',
    });
    expect(path).toBeUndefined();
  });
});

describe('playwrightLaunchHint', () => {
  test('returns a NixOS hint when no executable is configured', () => {
    if (!isLikelyNixOs()) {
      expect(playwrightLaunchHint(undefined)).toBeUndefined();
      return;
    }
    expect(playwrightLaunchHint(undefined)).toMatch(/NixOS/i);
    expect(playwrightLaunchHint('/usr/bin/chromium')).toBeUndefined();
  });
});
