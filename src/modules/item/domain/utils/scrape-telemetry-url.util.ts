import { createHash } from 'node:crypto';

export function scrapeTelemetryHost(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return 'invalid';
  }
}

/** Stable hash from host + pathname only (no query/fragment). */
export function scrapeTelemetryUrlHash(url: string): string {
  try {
    const parsed = new URL(url);
    const pathKey = `${parsed.hostname.toLowerCase()}${parsed.pathname}`;
    return createHash('sha256').update(pathKey).digest('hex').slice(0, 16);
  } catch {
    return createHash('sha256').update(url).digest('hex').slice(0, 16);
  }
}
