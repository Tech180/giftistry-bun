import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { randomBytes } from 'crypto';

const AUTO_DISABLED = new Set(['0', 'false', 'no', 'off']);

function isAutoJwtEnabled(): boolean {
  const raw = Bun.env.GIFTISTRY_AUTO_JWT_SECRET;
  if (raw === undefined || raw.trim() === '') return true;
  return !AUTO_DISABLED.has(raw.trim().toLowerCase());
}

/** Path for auto-persisted JWT: GIFTISTRY_JWT_SECRET_PATH or ${GIFTISTRY_STATE_DIR}/jwt_secret. */
export function resolveJwtSecretPath(): string {
  const explicit = Bun.env.GIFTISTRY_JWT_SECRET_PATH?.trim();
  if (explicit) return explicit;
  const stateDir = Bun.env.GIFTISTRY_STATE_DIR?.trim() || '/var/lib/giftistry';
  return join(stateDir, 'jwt_secret');
}

export function generateJwtSecretValue(): string {
  return randomBytes(48).toString('base64url');
}

/**
 * If `explicit` is set, return it. Otherwise in auto mode read or create a
 * durable secret under the state directory (wx race-safe for api+worker).
 * Returns undefined when auto is disabled and no explicit secret is provided.
 */
export function ensurePersistedJwtSecret(explicit: string | undefined): string | undefined {
  const trimmed = explicit?.trim();
  if (trimmed) return trimmed;

  if (!isAutoJwtEnabled()) {
    return undefined;
  }

  const path = resolveJwtSecretPath();

  try {
    const existing = readFileSync(path, 'utf-8').trim();
    if (existing.length > 0) return existing;
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
    const code = err && typeof err === 'object' && 'code' in err ? (err as NodeJS.ErrnoException).code : undefined;
    if (code === 'EEXIST') {
      const existing = readFileSync(path, 'utf-8').trim();
      if (existing.length > 0) return existing;
    }
    throw err;
  }
}
