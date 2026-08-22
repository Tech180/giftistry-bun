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

const NIX_SYSTEM_BIN_DIR = '/run/current-system/sw/bin';

export const NIXOS_PLAYWRIGHT_HINT =
  'Playwright’s bundled Chromium cannot run on NixOS (dynamic linker stub). ' +
  'Install a system browser (e.g. `nix-shell -p chromium`) and set ' +
  'SCRAPE_PLAYWRIGHT_EXECUTABLE_PATH to that binary, or enable nix-ld.';

export interface ResolvePlaywrightExecutableDeps {
  exists?: (path: string) => boolean;
  homeDir?: string;
  isNixOs?: boolean;
}

function nixCandidateDirs(homeDir: string): string[] {
  const dirs = [NIX_SYSTEM_BIN_DIR];
  if (homeDir) {
    dirs.push(join(homeDir, '.nix-profile', 'bin'));
  }
  return dirs;
}

function which(
  binary: string,
  env: NodeJS.ProcessEnv,
  exists: (path: string) => boolean
): string | undefined {
  const pathEnv = env.PATH;
  if (pathEnv !== undefined) {
    const paths = pathEnv.split(':');
    for (const p of paths) {
      if (!p) continue;
      const fullPath = join(p, binary);
      if (exists(fullPath)) {
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
 * Prefer an explicit env path, then a system Chromium/Chrome on PATH,
 * then well-known NixOS locations. Returns undefined so Playwright can
 * fall back to its downloaded browser on non-NixOS hosts.
 */
export function resolvePlaywrightExecutablePath(
  env: NodeJS.ProcessEnv = process.env,
  deps: ResolvePlaywrightExecutableDeps = {}
): string | undefined {
  const exists = deps.exists ?? existsSync;
  const homeDir = deps.homeDir ?? env.HOME ?? '';

  for (const key of ENV_KEYS) {
    const value = env[key]?.trim();
    if (value && exists(value)) {
      return value;
    }
  }

  for (const name of BINARY_NAMES) {
    const resolved = which(name, env, exists);
    if (resolved && exists(resolved)) {
      return resolved;
    }
  }

  for (const dir of nixCandidateDirs(homeDir)) {
    for (const name of BINARY_NAMES) {
      const fullPath = join(dir, name);
      if (exists(fullPath)) {
        return fullPath;
      }
    }
  }

  return undefined;
}

export function playwrightLaunchHint(
  executablePath: string | undefined,
  deps: Pick<ResolvePlaywrightExecutableDeps, 'isNixOs'> = {}
): string | undefined {
  if (executablePath) return undefined;
  if (!(deps.isNixOs ?? isLikelyNixOs())) return undefined;
  return NIXOS_PLAYWRIGHT_HINT;
}

/**
 * Resolves a Chromium path for Playwright launch. On NixOS, throws the
 * user-facing hint instead of attempting the bundled glibc binary.
 */
export function requirePlaywrightExecutableForLaunch(
  env: NodeJS.ProcessEnv = process.env,
  deps: ResolvePlaywrightExecutableDeps = {}
): string | undefined {
  const executablePath = resolvePlaywrightExecutablePath(env, deps);
  const hint = playwrightLaunchHint(executablePath, deps);
  if (hint) {
    throw new Error(hint);
  }
  return executablePath;
}
