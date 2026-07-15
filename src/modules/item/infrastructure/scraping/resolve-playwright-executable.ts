import { existsSync } from 'node:fs';

import { join } from 'node:path';

const ENV_KEYS = [
  'SCRAPE_PLAYWRIGHT_EXECUTABLE_PATH',
  'PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH',
] as const;

const BINARY_NAMES = [
  'chromium',
  'chromium-browser',
  'google-chrome-stable',
  'google-chrome',
] as const;

function which(binary: string, env: NodeJS.ProcessEnv = process.env): string | undefined {
  const pathEnv = env.PATH;
  if (pathEnv !== undefined) {
    const paths = pathEnv.split(':');
    for (const p of paths) {
      if (!p) continue;
      const fullPath = join(p, binary);
      if (existsSync(fullPath)) {
        return fullPath;
      }
    }
    return undefined;
  }
  if (typeof Bun !== 'undefined' && typeof Bun.which === 'function') {
    return Bun.which(binary) ?? undefined;
  }
  return undefined;
}

export function isLikelyNixOs(): boolean {
  return existsSync('/etc/NIXOS');
}

/**
 * Prefer an explicit env path, then a system Chromium/Chrome on PATH.
 * Returns undefined so Playwright can fall back to its downloaded browser.
 */
export function resolvePlaywrightExecutablePath(
  env: NodeJS.ProcessEnv = process.env
): string | undefined {
  for (const key of ENV_KEYS) {
    const value = env[key]?.trim();
    if (value && existsSync(value)) {
      return value;
    }
  }

  for (const name of BINARY_NAMES) {
    const resolved = which(name, env);
    if (resolved && existsSync(resolved)) {
      return resolved;
    }
  }

  return undefined;
}

export function playwrightLaunchHint(executablePath: string | undefined): string | undefined {
  if (executablePath || !isLikelyNixOs()) {
    return undefined;
  }

  return (
    'Playwright’s bundled Chromium cannot run on NixOS (dynamic linker stub). ' +
    'Install a system browser (e.g. `nix-shell -p chromium`) and set ' +
    'SCRAPE_PLAYWRIGHT_EXECUTABLE_PATH to that binary, or enable nix-ld.'
  );
}
