import { describe, expect, test } from 'bun:test';
import { NIXOS_PLAYWRIGHT_HINT } from '../src/modules/item/infrastructure/scraping/constants/playwright-executable.constant';
import {
  isLikelyNixOs,
  playwrightLaunchHint,
  requirePlaywrightExecutableForLaunch,
  resolvePlaywrightExecutablePath,
} from '../src/modules/item/infrastructure/scraping/utils/resolve-playwright-executable.util';

describe('resolvePlaywrightExecutablePath', () => {
  test('prefers SCRAPE_PLAYWRIGHT_EXECUTABLE_PATH when the file exists', () => {
    const path = resolvePlaywrightExecutablePath(
      {
        SCRAPE_PLAYWRIGHT_EXECUTABLE_PATH: '/opt/chromium',
        PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH: '/does/not/exist',
      },
      { exists: (candidate) => candidate === '/opt/chromium' }
    );
    expect(path).toBe('/opt/chromium');
  });

  test('ignores missing env paths', () => {
    const path = resolvePlaywrightExecutablePath(
      {
        SCRAPE_PLAYWRIGHT_EXECUTABLE_PATH: '/definitely/missing/chromium',
        PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH: '/also/missing',
        PATH: '',
      },
      { exists: () => false }
    );
    expect(path).toBeUndefined();
  });

  test('uses a NixOS system chromium when PATH is empty', () => {
    const path = resolvePlaywrightExecutablePath(
      { PATH: '' },
      {
        exists: (candidate) => candidate === '/run/current-system/sw/bin/chromium',
        homeDir: '/home/test',
      }
    );
    expect(path).toBe('/run/current-system/sw/bin/chromium');
  });

  test('uses a user nix-profile chromium', () => {
    const path = resolvePlaywrightExecutablePath(
      { PATH: '' },
      {
        exists: (candidate) => candidate === '/home/test/.nix-profile/bin/chromium',
        homeDir: '/home/test',
      }
    );
    expect(path).toBe('/home/test/.nix-profile/bin/chromium');
  });
});

describe('playwrightLaunchHint', () => {
  test('returns a NixOS hint when no executable is configured', () => {
    expect(playwrightLaunchHint(undefined, { isNixOs: true })).toBe(NIXOS_PLAYWRIGHT_HINT);
    expect(playwrightLaunchHint('/usr/bin/chromium', { isNixOs: true })).toBeUndefined();
    expect(playwrightLaunchHint(undefined, { isNixOs: false })).toBeUndefined();
  });

  test('detects the host OS when isNixOs is omitted', () => {
    if (!isLikelyNixOs()) {
      expect(playwrightLaunchHint(undefined)).toBeUndefined();
      return;
    }
    expect(playwrightLaunchHint(undefined)).toBe(NIXOS_PLAYWRIGHT_HINT);
  });
});

describe('requirePlaywrightExecutableForLaunch', () => {
  test('throws the NixOS hint when no browser is found', () => {
    expect(() =>
      requirePlaywrightExecutableForLaunch(
        { PATH: '' },
        { exists: () => false, isNixOs: true, homeDir: '/home/test' }
      )
    ).toThrow(NIXOS_PLAYWRIGHT_HINT);
  });

  test('returns undefined on non-NixOS when no browser is found', () => {
    expect(
      requirePlaywrightExecutableForLaunch(
        { PATH: '' },
        { exists: () => false, isNixOs: false, homeDir: '/home/test' }
      )
    ).toBeUndefined();
  });

  test('returns a discovered NixOS chromium path', () => {
    expect(
      requirePlaywrightExecutableForLaunch(
        { PATH: '' },
        {
          exists: (candidate) => candidate === '/run/current-system/sw/bin/chromium',
          isNixOs: true,
          homeDir: '/home/test',
        }
      )
    ).toBe('/run/current-system/sw/bin/chromium');
  });
});
