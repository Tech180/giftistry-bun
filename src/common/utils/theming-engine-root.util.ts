import { join } from 'path';

/** Absolute path to the sibling `theming-engine` checkout (see docs/INSTALL.md). */
export function getThemingEngineRoot(): string {
  return join(import.meta.dir, '../../../..', 'theming-engine');
}

export function getThemingEnginePath(...segments: string[]): string {
  return join(getThemingEngineRoot(), ...segments);
}
