import { computeTokensPerSecond } from '@/modules/item/infrastructure/ai-text-completion-stream.util';

export type JobProgressRateUnit = 'tok/s' | 'items/s';

export interface JobProgressRate {
  Value: number;
  Unit: JobProgressRateUnit;
}

export { computeTokensPerSecond };

/** Completed items per second from count and elapsed milliseconds. */
export function computeItemsPerSecond(
  completed: number,
  elapsedMs: number
): number | null {
  if (!(completed > 0) || !(elapsedMs > 0)) return null;
  const rate = (completed / elapsedMs) * 1000;
  if (!(rate > 0)) return null;
  if (rate < 10) {
    return Math.round(rate * 10) / 10;
  }
  return Math.round(rate);
}

export function formatProgressRate(
  rate: JobProgressRate | null | undefined
): string {
  if (!rate || !(rate.Value > 0)) return '';
  if (rate.Unit === 'items/s' && rate.Value < 10 && !Number.isInteger(rate.Value)) {
    return `${rate.Value.toFixed(1)} ${rate.Unit}`;
  }
  return `${rate.Value} ${rate.Unit}`;
}

export function mergeResultProgressRate(
  result: Record<string, unknown>,
  rate: JobProgressRate | null
): Record<string, unknown> {
  const next = { ...result };
  if (rate == null) {
    delete next.ProgressRate;
  } else {
    next.ProgressRate = rate;
  }
  return next;
}

export function readResultProgressRate(
  result: Record<string, unknown> | null | undefined
): JobProgressRate | null {
  if (!result || typeof result !== 'object') return null;
  const raw = result.ProgressRate;
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as { Value?: unknown; Unit?: unknown };
  const value = typeof record.Value === 'number' ? record.Value : Number(record.Value);
  const unit = record.Unit;
  if (!Number.isFinite(value) || value <= 0) return null;
  if (unit !== 'tok/s' && unit !== 'items/s') return null;
  return { Value: value, Unit: unit };
}

export function tokensPerSecondRate(
  tokensPerSecond: number | null | undefined
): JobProgressRate | null {
  if (tokensPerSecond == null || !(tokensPerSecond > 0)) return null;
  return { Value: Math.round(tokensPerSecond), Unit: 'tok/s' };
}

export function itemsPerSecondRate(
  completed: number,
  elapsedMs: number
): JobProgressRate | null {
  const value = computeItemsPerSecond(completed, elapsedMs);
  if (value == null) return null;
  return { Value: value, Unit: 'items/s' };
}
