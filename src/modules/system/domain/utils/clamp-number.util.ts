import type { ClampNumberBounds } from '../interfaces/clamp-number-bounds.interface';

export function clampNumber(value: unknown, { min, max, fallback }: ClampNumberBounds): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.round(n)));
}
