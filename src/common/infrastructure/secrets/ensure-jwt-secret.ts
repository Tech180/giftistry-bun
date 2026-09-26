import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { isAutoJwtEnabled } from './utils/is-auto-jwt-enabled.util';
import { resolveJwtSecretPath } from './utils/resolve-jwt-secret-path.util';
import { generateJwtSecretValue } from './utils/generate-jwt-secret-value.util';

/**
 * If `explicit` is set, return it. Otherwise in auto mode read or create a
 * durable secret under the state directory (wx race-safe for api+worker).
 * Returns undefined when auto is disabled and no explicit secret is provided.
 */
export function ensurePersistedJwtSecret(explicit: string | undefined): string | undefined {
  const trimmed = explicit?.trim();
  if (trimmed) {
    return trimmed;
  }

  if (!isAutoJwtEnabled()) {
    return undefined;
  }

  const path = resolveJwtSecretPath();

  try {
    const existing = readFileSync(path, 'utf-8').trim();
    if (existing.length > 0) {
      return existing;
    }
  } catch {
    // File missing or unreadable — try create.
  }

  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const secret = generateJwtSecretValue();

  try {
    writeFileSync(path, `${secret}\n`, { encoding: 'utf-8', mode: 0o600, flag: 'wx' });
    console.info(`[boot] Generated JWT_SECRET at ${path} (persisted; include in backups)`);
    return secret;
  } catch (err) {
    const code =
      err && typeof err === 'object' && 'code' in err ? (err as NodeJS.ErrnoException).code : undefined;
    if (code === 'EEXIST') {
      const existing = readFileSync(path, 'utf-8').trim();
      if (existing.length > 0) {
        return existing;
      }
    }
    throw err;
  }
}
