import type { ExtractMetadataPhase } from '@/modules/item/domain/extract-metadata-phase';
import { tokensPerSecondRate, type JobProgressRate } from './job-progress-rate.util';

export type GrabPhase = ExtractMetadataPhase;

const PHASE_DETAIL: Record<GrabPhase, string> = {
  scraping: 'Scraping…',
  categorizing: 'Categorizing…',
  researching: 'Researching…',
  populating: 'Populating…',
};

export function formatGrabPhaseDetail(phase: GrabPhase | null | undefined): string | null {
  if (!phase) return null;
  return PHASE_DETAIL[phase] ?? null;
}

export function readGrabPhase(
  payload: Record<string, unknown> | null | undefined
): GrabPhase | null {
  const value = payload?.GrabPhase;
  if (
    value === 'scraping' ||
    value === 'categorizing' ||
    value === 'researching' ||
    value === 'populating'
  ) {
    return value;
  }
  return null;
}

export function readTokensPerSecond(
  payload: Record<string, unknown> | null | undefined
): number | null {
  const value = payload?.TokensPerSecond;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function grabPhasePayloadPatch(
  phase: GrabPhase,
  tokensPerSecond?: number | null
): Record<string, unknown> {
  const clearRate = phase === 'scraping' || phase === 'researching';
  const rate = clearRate ? null : tokensPerSecondRate(tokensPerSecond ?? null);
  return {
    GrabPhase: phase,
    TokensPerSecond: rate?.Value ?? null,
  };
}

export function clearGrabPhasePayloadPatch(): Record<string, unknown> {
  return {
    GrabPhase: null,
    TokensPerSecond: null,
  };
}

export function streamProgressRateFromPayload(
  payload: Record<string, unknown> | null | undefined
): JobProgressRate | null {
  const phase = readGrabPhase(payload);
  if (phase !== 'categorizing' && phase !== 'populating') return null;
  return tokensPerSecondRate(readTokensPerSecond(payload));
}
