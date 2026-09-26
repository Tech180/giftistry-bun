import { StatusMap } from 'elysia';

export function getNumericStatus(status: unknown, defaultStatus = 200): number {
  if (typeof status === 'number') {
    return status;
  }

  if (typeof status === 'string') {
    const code = (StatusMap as Record<string, number | undefined>)[status];
    if (code !== undefined) {
      return code;
    }

    const parsed = parseInt(status, 10);
    if (!isNaN(parsed)) {
      return parsed;
    }
  }

  return defaultStatus;
}
