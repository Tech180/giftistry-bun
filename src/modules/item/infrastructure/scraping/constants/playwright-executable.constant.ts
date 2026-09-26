export const PLAYWRIGHT_EXECUTABLE_ENV_KEYS = [
  'SCRAPE_PLAYWRIGHT_EXECUTABLE_PATH',
  'PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH',
] as const;

export const PLAYWRIGHT_BINARY_NAMES = [
  'chromium',
  'chromium-browser',
  'google-chrome-stable',
  'google-chrome',
] as const;

export const NIX_SYSTEM_BIN_DIR = '/run/current-system/sw/bin';

export const NIXOS_PLAYWRIGHT_HINT =
  'Playwright’s bundled Chromium cannot run on NixOS (dynamic linker stub). ' +
  'Install a system browser (e.g. `nix-shell -p chromium`) and set ' +
  'SCRAPE_PLAYWRIGHT_EXECUTABLE_PATH to that binary, or enable nix-ld.';
